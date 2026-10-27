import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { bannerLines, escapeSvg, type BannerDraft, type BannerVariant } from '../model';

let fontsReady: Promise<void> | undefined;

function registerBannerFonts(): Promise<void> {
  // Register the bundled fonts with Pango before librsvg renders any text.
  // A slim production image may have no system fonts or Fontconfig configuration.
  return (fontsReady ??= (async () => {
    for (const [file, font] of [
      ['DejaVuSans.ttf', 'DejaVu Sans 12'],
      ['DejaVuSans-Bold.ttf', 'DejaVu Sans Bold 12'],
    ] as const) {
      const fontfile = path.resolve('assets/fonts/dejavu', file);
      // Sharp can silently fall back when fontfile is missing; fail the request instead.
      await access(fontfile);
      await sharp({ text: { text: 'Ag', font, fontfile } })
        .png()
        .toBuffer();
    }
  })().catch((error: unknown) => {
    fontsReady = undefined;
    throw error;
  }));
}

// These colors belong to exported artwork, never to the application interface.
const palettes = {
  violet: { background: '#f0edfb', ink: '#352273', accent: '#452e9a' },
  rose: { background: '#fff0f3', ink: '#70233f', accent: '#a32f58' },
  ocean: { background: '#eaf5fc', ink: '#153f60', accent: '#21628e' },
  forest: { background: '#eef6ef', ink: '#254b34', accent: '#326947' },
};

export async function renderBanner(
  draft: BannerDraft,
  name: string,
  logo: Uint8Array,
  variant: BannerVariant,
): Promise<Buffer> {
  await registerBannerFonts();
  const color = palettes[draft.palette];
  const height = variant === 'welcome' ? 300 : 500;
  const x = variant === 'welcome' ? 270 : 48;
  const width = variant === 'welcome' ? 28 : 42;
  const title = variant === 'welcome' ? name : draft.title;
  const subtitle = variant === 'welcome' ? draft.title : draft.subtitle;
  const titleLines = bannerLines(title, width);
  const subtitleLines = bannerLines(subtitle, width + 8);
  const start = variant === 'welcome' ? 90 : 300;
  const text = (lines: string[], y: number, size: number, bold = false) =>
    lines
      .map(
        (line, index) =>
          `<text x="${x}" y="${y + index * (size + 12)}" font-family="DejaVu Sans, sans-serif" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${color.ink}">${escapeSvg(line)}</text>`,
      )
      .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="${height}">
    <rect width="750" height="${height}" fill="${color.background}"/>
    <rect x="0" y="0" width="12" height="${height}" fill="${color.accent}"/>
    ${text(titleLines, start, 25, true)}
    ${text(subtitleLines, start + titleLines.length * 37 + 12, 19)}
  </svg>`;
  const logoImage = await sharp(logo, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(180, 180, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();
  return sharp(Buffer.from(svg))
    .composite([
      {
        input: logoImage,
        left: variant === 'welcome' ? 48 : 285,
        top: variant === 'welcome' ? 60 : 45,
      },
    ])
    .png()
    .toBuffer();
}

import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { escapeSvg, type BannerDraft, type BannerVariant } from '../model';

const BANNER_WIDTH = 750;
const MARGIN = 24;
const FONT_DIRECTORY = path.resolve('assets/fonts/dejavu');

// These colors belong to exported artwork, never to the application interface.
const palettes = {
  violet: { background: '#f0edfb', ink: '#352273', accent: '#452e9a' },
  rose: { background: '#fff0f3', ink: '#70233f', accent: '#a32f58' },
  ocean: { background: '#eaf5fc', ink: '#153f60', accent: '#21628e' },
  forest: { background: '#eef6ef', ink: '#254b34', accent: '#326947' },
};

async function renderText(
  value: string,
  color: string,
  width: number,
  height: number,
  bold: boolean,
) {
  const fontfile = path.join(FONT_DIRECTORY, bold ? 'DejaVuSans-Bold.ttf' : 'DejaVuSans.ttf');
  // Sharp can silently fall back when a bundled font is missing.
  await access(fontfile);
  const text = value
    .toWellFormed()
    .replace(/\s+/g, ' ')
    .replace(/[\p{Cc}\uFFFE\uFFFF]/gu, '');
  if (!text.replace(/\p{Default_Ignorable_Code_Point}/gu, '').trim()) return null;

  // Let Pango wrap by glyph width, with a break inside words only when needed.
  const layer = await sharp({
    text: {
      text: `<span foreground="${color}">${escapeSvg(text)}</span>`,
      font: bold ? 'DejaVu Sans Bold 25' : 'DejaVu Sans 19',
      fontfile,
      width,
      wrap: 'word-char',
      spacing: 8,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  if (layer.info.width <= width && layer.info.height <= height) return layer;

  // Keep unusually tall text or a wide glyph inside the artwork as well.
  return sharp(layer.data).resize(width, height, { fit: 'inside' }).png().toBuffer({
    resolveWithObject: true,
  });
}

export async function renderBanner(
  draft: BannerDraft,
  name: string,
  logo: Uint8Array,
  variant: BannerVariant,
): Promise<Buffer> {
  const color = palettes[draft.palette];
  const welcome = variant === 'welcome';
  const height = welcome ? 300 : 500;
  const left = welcome ? 270 : 48;
  const titleTop = welcome ? 72 : 282;
  const width = BANNER_WIDTH - left - MARGIN;
  const bottom = height - MARGIN;
  const title = await renderText(
    welcome ? name : draft.title,
    color.ink,
    width,
    Math.floor((bottom - titleTop) / 2),
    true,
  );
  const subtitleTop = Math.max(titleTop + 52, titleTop + (title?.info.height ?? 0) + 12);
  const subtitle = await renderText(
    welcome ? draft.title : draft.subtitle,
    color.ink,
    width,
    bottom - subtitleTop,
    false,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BANNER_WIDTH}" height="${height}">
    <rect width="${BANNER_WIDTH}" height="${height}" fill="${color.background}"/>
    <rect x="0" y="0" width="12" height="${height}" fill="${color.accent}"/>
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
        left: welcome ? 48 : 285,
        top: welcome ? 60 : 45,
      },
      ...(title ? [{ input: title.data, left, top: titleTop }] : []),
      ...(subtitle ? [{ input: subtitle.data, left, top: subtitleTop }] : []),
    ])
    .png()
    .toBuffer();
}

import { z } from 'zod';

export const BANNER_KIT_PATH = '/loja-pronta/marca/banners';
export const bannerDraftSchema = z.object({
  title: z.string().trim().min(1).max(48),
  subtitle: z.string().trim().min(1).max(80),
  palette: z.enum(['violet', 'rose', 'ocean', 'forest']),
});
export type BannerDraft = z.infer<typeof bannerDraftSchema>;
export const bannerVariants = ['welcome', 'selection'] as const;
export type BannerVariant = (typeof bannerVariants)[number];

export function escapeSvg(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]!,
  );
}

/** Conservative wrapping keeps user text inside the exported image. */
export function bannerLines(value: string, limit: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    for (let offset = 0; offset < word.length; offset += limit) {
      const part = word.slice(offset, offset + limit);
      if (line && line.length + part.length + 1 > limit) {
        lines.push(line);
        line = '';
      }
      line += (line ? ' ' : '') + part;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function kitIsApproved(
  kit: { approvedAt: Date | null; brandFingerprint: string },
  currentFingerprint: string,
): boolean {
  return Boolean(kit.approvedAt && kit.brandFingerprint === currentFingerprint);
}

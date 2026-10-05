import type { VIDEO_TYPES } from '@/config/videos';

/**
 * O tipo do vídeo pelos primeiros bytes: MP4 tem "ftyp" na posição 4; WebM começa com a
 * assinatura do Matroska (1A 45 DF A3). Outro arquivo: `null`.
 */
export function videoType(bytes: Uint8Array): keyof typeof VIDEO_TYPES | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length > 12 && ascii(4, 8) === 'ftyp') return 'video/mp4';
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'video/webm';
  }
  return null;
}

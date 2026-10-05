import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { normalizeProfilePhoto } from './profile-photo-image';

describe('normalização da foto', () => {
  test('JPEG, PNG e WebP viram um quadrado leve, sem EXIF', async () => {
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const input = await sharp({
        create: { width: 800, height: 600, channels: 3, background: 'red' },
      })
        .withMetadata({ orientation: 6 })
        .toFormat(format)
        .toBuffer();
      const normalized = await normalizeProfilePhoto(input);
      expect(normalized).not.toBeNull();
      const result = await sharp(normalized!).metadata();
      expect(result.format).toBe('webp');
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
      expect(result.exif).toBeUndefined();
      expect(result.orientation).toBeUndefined();
    }
  });

  test('recusa arquivos falsos, vazios, SVG e GIF', async () => {
    const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } })
      .gif()
      .toBuffer();
    for (const input of [
      new Uint8Array(),
      new TextEncoder().encode('não é uma foto'),
      new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',
      ),
      gif,
    ]) {
      expect(await normalizeProfilePhoto(input)).toBeNull();
    }
  });

  test('recusa imagens que ultrapassam o limite de pixels', async () => {
    const input = await sharp({
      create: { width: 6400, height: 6400, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    expect(await normalizeProfilePhoto(input)).toBeNull();
  });
});

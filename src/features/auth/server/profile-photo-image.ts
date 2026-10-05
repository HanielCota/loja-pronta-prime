import sharp from 'sharp';

/**
 * Confere o conteúdo, corrige a orientação e corta no centro para o círculo do perfil. Guarda
 * só 512px em WebP, sem os metadados da foto (incluindo a localização do celular).
 */
export async function normalizeProfilePhoto(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' });
    const { format, pages } = await image.metadata();
    if (!format || !['jpeg', 'png', 'webp'].includes(format) || (pages ?? 1) > 1) return null;
    const photo = await image
      .rotate()
      .resize(512, 512, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    return new Uint8Array(photo);
  } catch {
    return null;
  }
}

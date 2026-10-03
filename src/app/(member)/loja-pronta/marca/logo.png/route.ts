import sharp from 'sharp';
import { ownLogoSvg } from '@/features/brand/server/logo-image';

/** Nome do arquivo: "logo-pet-da-ana.png". */
function fileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `logo-${slug || 'loja'}.png`;
}

/**
 * O logo dela em PNG de 1000×1000, pra baixar (e, na publicação, pra enviar à Shopee). Sempre o
 * logo salvo: a URL não muda o desenho.
 */
export async function GET() {
  const logo = await ownLogoSvg(new URLSearchParams());
  if (!logo) return new Response('Não encontrado', { status: 404 });
  const png = await sharp(Buffer.from(logo.svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${fileName(logo.name)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

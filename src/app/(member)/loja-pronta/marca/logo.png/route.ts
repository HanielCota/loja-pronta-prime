import { storage } from '@/server/storage';
import { getOwnBrandForImage } from '@/features/brand/server/brand';

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
 * O logo que ela escolheu (o PNG criado no chat), só pra dona. Com `?baixar=1`, vem como arquivo
 * pra baixar (e, na publicação, pra enviar à Shopee).
 */
export async function GET(request: Request) {
  const owner = await getOwnBrandForImage();
  const key = owner?.brand.logoImage;
  if (!owner || !key) return new Response('Não encontrado', { status: 404 });
  const png = await storage().get(key);
  if (!png) return new Response('Não encontrado', { status: 404 });
  const download = new URL(request.url).searchParams.get('baixar') === '1';
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(download
        ? { 'Content-Disposition': `attachment; filename="${fileName(owner.brand.name ?? '')}"` }
        : {}),
    },
  });
}

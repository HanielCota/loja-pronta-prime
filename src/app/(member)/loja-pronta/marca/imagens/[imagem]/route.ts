import { readLogoImage } from '@/features/brand/logo-studio/server/logo-images';
import { getOwnBrandForImage } from '@/features/brand/server/brand';

/**
 * Um logo do estúdio (pra ela ver e escolher). Só os dela: a chave é montada com o id da
 * sessão, então o id de outra aluna simplesmente não existe aqui. A imagem de um id nunca muda.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ imagem: string }> }) {
  const owner = await getOwnBrandForImage();
  if (!owner) return new Response('Não encontrado', { status: 404 });
  const { imagem } = await params;
  const png = await readLogoImage(owner.userId, imagem);
  if (!png) return new Response('Não encontrado', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

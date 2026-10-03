import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { LOGO_FONTS } from '@/features/brand/fonts';

/**
 * As fontes do logo pro editor livre, que desenha o texto no navegador com o mesmo desenho do
 * servidor. Só as da lista (nada de caminho vindo da URL); são fontes livres (OFL) e não mudam,
 * então o navegador guarda de vez.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fonte: string }> }) {
  const { fonte } = await params;
  const font = LOGO_FONTS.find((item) => item.id === fonte);
  if (!font) return new Response('Não encontrada', { status: 404 });
  const file = await readFile(path.join(process.cwd(), 'node_modules', font.file));
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'font/woff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BRAND_FONTS } from '@/features/brand/fonts';

/**
 * As letras da marca, pra tela do nome mostrar o nome na letra do estilo dela. Só as da lista
 * (nada de caminho vindo da URL); são fontes livres (OFL) e não mudam, então o navegador guarda
 * de vez.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fonte: string }> }) {
  const { fonte } = await params;
  const font = BRAND_FONTS.find((item) => item.id === fonte);
  if (!font) return new Response('Não encontrada', { status: 404 });
  const file = await readFile(path.join(process.cwd(), 'node_modules', font.file));
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'font/woff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

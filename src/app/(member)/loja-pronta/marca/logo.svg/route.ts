import { ownLogoSvg } from '@/features/brand/server/logo-image';

/**
 * Prévia do logo dela (modelos e estúdio), desenhada na hora a partir dos parâmetros. Privada:
 * só a dona vê, e o SVG não roda nada (a política bloqueia script, mesmo aberto direto).
 */
export async function GET(request: Request) {
  const logo = await ownLogoSvg(new URL(request.url).searchParams);
  if (!logo) return new Response('Não encontrado', { status: 404 });
  return new Response(logo.svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}

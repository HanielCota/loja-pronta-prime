import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts } from '@/features/products/server/access';
import { getVideo } from '@/features/videos/server/videos';
import { isVideoSlot } from '@/config/videos';
import { storage } from '@/server/storage';

/** "bytes=0-" ou "bytes=100-199" (um trecho só; outro formato: o arquivo inteiro). */
const RANGE = /^bytes=\d*-\d*$/;

/**
 * Um vídeo da jornada, pra quem tem a Loja Pronta. Responde em pedaços (Range), como o navegador
 * pede pra avançar e voltar sem baixar tudo. O endereço muda quando o vídeo é trocado (`?v=`),
 * então o navegador pode guardar o arquivo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user)) {
    return new Response('Não encontrado', { status: 404 });
  }
  const { slot } = await params;
  if (!isVideoSlot(slot)) return new Response('Não encontrado', { status: 404 });
  const [{ products }, video] = await Promise.all([
    getStudentProducts(session.user.id),
    getVideo(slot),
  ]);
  if (!products.includes('loja-pronta') || !video) {
    return new Response('Não encontrado', { status: 404 });
  }

  // "?legenda=1": a legenda do vídeo (WebVTT), inteira.
  if (new URL(request.url).searchParams.get('legenda') === '1') {
    const captions = video.captionsKey ? await storage().get(video.captionsKey) : null;
    if (!captions) return new Response('Não encontrado', { status: 404 });
    return new Response(new Uint8Array(captions), {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const asked = request.headers.get('range') ?? undefined;
  const range = asked && RANGE.test(asked) ? asked : undefined;
  let stored;
  try {
    stored = await storage().stream(video.key, range);
  } catch (error) {
    // Trecho fora do arquivo (o S3 responde 416): diz o tamanho certo.
    if (error instanceof Error && error.name === 'InvalidRange') {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${video.size}` },
      });
    }
    throw error;
  }
  if (!stored) return new Response('Não encontrado', { status: 404 });
  return new Response(stored.body, {
    status: stored.contentRange ? 206 : 200,
    headers: {
      'Content-Type': video.contentType,
      ...(stored.length === undefined ? {} : { 'Content-Length': String(stored.length) }),
      'Accept-Ranges': 'bytes',
      ...(stored.contentRange ? { 'Content-Range': stored.contentRange } : {}),
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

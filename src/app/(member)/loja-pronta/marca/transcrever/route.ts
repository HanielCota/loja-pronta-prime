import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/config/env';
import { requireBrandAction } from '@/features/brand/server/brand';
import { transcribeSpeech } from '@/features/brand/logo-studio/server/transcribe';
import { consumeAttempts } from '@/server/auth/rate-limit';

/** Uma fala curta cabe aqui mesmo nos formatos menos compactos do celular. */
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 20_000;
const AUDIO_TYPES = new Set(['audio/webm', 'audio/mp4', 'audio/ogg']);
const TRANSCRIPTION_ERROR = 'Não consegui transcrever agora. Tente de novo ou escreva.';

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  // O navegador envia da própria tela. Origem alheia não pode gastar a cota da aluna.
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return failure('Pedido inválido.', 403);
  }
  const { userId } = await requireBrandAction({ logo: true });
  if (!env.OPENAI_API_KEY) return failure('Falar em vez de escrever: em breve.', 503);
  const length = Number(request.headers.get('content-length'));
  if (length > MAX_REQUEST_BYTES) return failure('A gravação ficou longa demais.', 413);
  const limited = await consumeAttempts([
    ['speechPerUser', userId],
    ['speechPerUserPerDay', userId],
  ]);
  if (limited)
    return failure('Você já usou o microfone várias vezes. Tente de novo mais tarde.', 429);

  let audio: FormDataEntryValue | null;
  try {
    // Não confia só no Content-Length: pedidos sem esse cabeçalho também param no limite.
    const reader = request.body?.getReader();
    const contentType = request.headers.get('content-type');
    if (!reader || !contentType?.startsWith('multipart/form-data')) {
      return failure('Não consegui receber a gravação. Tente de novo.', 400);
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_REQUEST_BYTES) {
        void reader.cancel().catch(() => {});
        return failure('A gravação ficou longa demais.', 413);
      }
      chunks.push(value);
    }
    const body = new Blob([new Uint8Array(Buffer.concat(chunks))]);
    const bounded = new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body,
    });
    audio = (await bounded.formData()).get('audio');
  } catch {
    return failure('Não consegui receber a gravação. Tente de novo.', 400);
  }
  if (!(audio instanceof File) || !audio.size || audio.size > MAX_AUDIO_BYTES) {
    return failure('A gravação está vazia ou ficou longa demais. Tente de novo.', 400);
  }
  if (!AUDIO_TYPES.has(audio.type.split(';')[0]!)) {
    return failure('Este formato de gravação não funciona aqui. Tente outro navegador.', 415);
  }
  try {
    const text = await transcribeSpeech(audio);
    if (!text) return failure('Não ouvi nenhuma fala. Toque no microfone e tente de novo.', 422);
    return NextResponse.json({ text });
  } catch {
    return failure(TRANSCRIPTION_ERROR, 503);
  }
}

import OpenAI from 'openai';
import { env } from '@/config/env';
import { AiUnavailableError, describe } from '@/server/ai/errors';

/** Não guarda o áudio no banco nem no bucket: a OpenAI devolve só o texto para revisão. */
const TIMEOUT_MS = 60_000;
let client: OpenAI | undefined;

export async function transcribeSpeech(audio: File): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new AiUnavailableError('OPENAI_API_KEY não configurada');
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    const result = await client.audio.transcriptions.create({
      file: audio,
      model: 'gpt-transcribe',
      languages: ['pt'],
    });
    return result.text.trim();
  } catch (error) {
    console.error(`[speech] OpenAI falhou: ${describe(error)}`);
    throw new AiUnavailableError('Falha na transcrição', { cause: error });
  }
}

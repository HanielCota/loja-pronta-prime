import OpenAI from 'openai';
import { env } from '@/config/env';
import { AiUnavailableError, describe, rejectedByApi } from './errors';

/** Um gerador de imagem: recebe a descrição e devolve um PNG quadrado. */
export type ImageGenerator = (prompt: string) => Promise<Uint8Array>;

/**
 * O modelo de imagem mais barato da OpenAI que ainda escreve bem o nome da loja. Qualidade
 * "medium" em 1024×1024: o logo da Shopee aparece no máximo com uns 200px, então mais não ajuda
 * e custa várias vezes mais.
 */
const OPENAI_IMAGE_MODEL = 'gpt-image-1-mini';
const SIZE = '1024x1024';
const QUALITY = 'medium';
/** Gerar imagem demora: até 2 minutos antes de desistir. */
const TIMEOUT_MS = 120_000;
/**
 * Sem tentar de novo sozinho: uma segunda tentativa depois de 2 minutos deixaria ela esperando
 * 4. A tela já oferece "tentar de novo".
 */
const MAX_RETRIES = 0;

let client: OpenAI | undefined;

function openAi(): OpenAI {
  if (!env.OPENAI_API_KEY) throw new AiUnavailableError('OPENAI_API_KEY não configurada');
  client ??= new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  return client;
}

/** A OpenAI (Images API), em PNG. */
export const openAiImage: ImageGenerator = async (prompt) => {
  let response: OpenAI.ImagesResponse;
  try {
    response = await openAi().images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      output_format: 'png',
      n: 1,
    });
  } catch (error) {
    // A mensagem pode explicar (ex.: pedido barrado pela moderação), mas não vai pra tela.
    throw new AiUnavailableError(`OpenAI falhou: ${describe(error)}`, {
      cause: error,
      mayHaveBilled: !rejectedByApi(error),
    });
  }
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new AiUnavailableError('OpenAI respondeu sem imagem', { mayHaveBilled: true });
  return new Uint8Array(Buffer.from(base64, 'base64'));
};

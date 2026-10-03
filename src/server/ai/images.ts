import { env } from '@/config/env';
import { AiUnavailableError } from './errors';

/** Um gerador de imagem: recebe a descrição e devolve um PNG quadrado. */
export type ImageGenerator = (prompt: string) => Promise<Uint8Array>;

const OPENAI_URL = 'https://api.openai.com/v1/images/generations';
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

type OpenAiImageResponse = { data?: { b64_json?: string }[] };

/** A OpenAI (Images API), em PNG. */
export const openAiImage: ImageGenerator = async (prompt) => {
  if (!env.OPENAI_API_KEY) throw new AiUnavailableError('OPENAI_API_KEY não configurada');
  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size: SIZE,
        quality: QUALITY,
        output_format: 'png',
        n: 1,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new AiUnavailableError('OpenAI não respondeu', { cause: error });
  }
  if (!response.ok) {
    // O corpo pode explicar (ex.: pedido barrado pela moderação), mas não vai pra tela.
    const detail = await response.text().catch(() => '');
    throw new AiUnavailableError(`OpenAI respondeu ${response.status}: ${detail.slice(0, 300)}`);
  }
  let data: OpenAiImageResponse;
  try {
    data = (await response.json()) as OpenAiImageResponse;
  } catch (error) {
    throw new AiUnavailableError('OpenAI respondeu algo que não é JSON', { cause: error });
  }
  const base64 = data.data?.[0]?.b64_json;
  if (!base64) throw new AiUnavailableError('OpenAI respondeu sem imagem');
  return new Uint8Array(Buffer.from(base64, 'base64'));
};

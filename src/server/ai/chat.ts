import { env } from '@/config/env';
import { AiUnavailableError } from './errors';

/** Uma mensagem da conversa com o modelo de texto. */
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** Um modelo de texto que responde em JSON (quem chama confere o formato). */
export type JsonChat = (messages: ChatMessage[]) => Promise<string>;

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
/** O modelo de conversa do DeepSeek (barato e bom em português). */
const DEEPSEEK_MODEL = 'deepseek-chat';
/** Respostas curtas: o chat faz uma pergunta por vez. */
const MAX_TOKENS = 700;
const TIMEOUT_MS = 30_000;

type DeepSeekResponse = { choices?: { message?: { content?: string } }[] };

/** O DeepSeek, pedindo a resposta em JSON (`response_format: json_object`). */
export const deepseekJsonChat: JsonChat = async (messages) => {
  if (!env.DEEPSEEK_API_KEY) throw new AiUnavailableError('DEEPSEEK_API_KEY não configurada');
  let response: Response;
  try {
    response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new AiUnavailableError('DeepSeek não respondeu', { cause: error });
  }
  if (!response.ok) {
    throw new AiUnavailableError(`DeepSeek respondeu ${response.status}`);
  }
  let data: DeepSeekResponse;
  try {
    data = (await response.json()) as DeepSeekResponse;
  } catch (error) {
    throw new AiUnavailableError('DeepSeek respondeu algo que não é JSON', { cause: error });
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiUnavailableError('DeepSeek respondeu sem conteúdo');
  return content;
};

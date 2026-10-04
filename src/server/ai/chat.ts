import OpenAI from 'openai';
import { env } from '@/config/env';
import { AiUnavailableError, describe } from './errors';

/** Uma mensagem da conversa com o modelo de texto. */
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** Um modelo de texto que responde em JSON (quem chama confere o formato). */
export type JsonChat = (messages: ChatMessage[]) => Promise<string>;

/** O DeepSeek fala a mesma API da OpenAI: o SDK dela serve, só muda o endereço. */
const DEEPSEEK_URL = 'https://api.deepseek.com';
/** O modelo de conversa do DeepSeek (barato e bom em português). */
const DEEPSEEK_MODEL = 'deepseek-chat';
/** Respostas curtas: o chat faz uma pergunta por vez. */
const MAX_TOKENS = 700;
const TIMEOUT_MS = 30_000;
/** Mais uma tentativa quando a rede ou o DeepSeek falham (429, 5xx, sem resposta). */
const MAX_RETRIES = 1;

let client: OpenAI | undefined;

function deepseek(): OpenAI {
  if (!env.DEEPSEEK_API_KEY) throw new AiUnavailableError('DEEPSEEK_API_KEY não configurada');
  client ??= new OpenAI({
    apiKey: env.DEEPSEEK_API_KEY,
    baseURL: DEEPSEEK_URL,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  return client;
}

/** O DeepSeek, pedindo a resposta em JSON (`response_format: json_object`). */
export const deepseekJsonChat: JsonChat = async (messages) => {
  let completion: OpenAI.ChatCompletion;
  try {
    completion = await deepseek().chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
    });
  } catch (error) {
    throw new AiUnavailableError(`DeepSeek falhou: ${describe(error)}`, { cause: error });
  }
  const content = completion.choices[0]?.message.content;
  if (!content) throw new AiUnavailableError('DeepSeek respondeu sem conteúdo');
  return content;
};

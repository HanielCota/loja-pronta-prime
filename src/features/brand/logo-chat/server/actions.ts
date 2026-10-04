'use server';

import { redirect } from 'next/navigation';
import { AiUnavailableError } from '@/server/ai/errors';
import { requireBrandAction } from '../../server/brand';
import { saveBrand } from '../../server/brand-store';
import { brandStepPath } from '../../steps';
import { assistantMessage, type ChatView } from '../chat-view';
import type { InterviewContext } from '../interviewer-prompt';
import {
  MAX_GENERATIONS,
  MAX_MESSAGE_CHARS,
  MAX_TOTAL_TURNS,
  MAX_USER_MESSAGES,
  userMessageCount,
  type LogoChat,
  type LogoChatMessage,
} from '../model';
import {
  appendMessages,
  clearLogoChat,
  releaseGeneration,
  reserveGeneration,
  reserveTurn,
} from './chat-store';
import { nextAssistantTurn } from './interviewer';
import { currentChat, view } from './load';
import { drawLogo, logoImageKey, storeLogoImage } from './logo-images';

/**
 * O chat do logo: mandar mensagem, tentar a resposta de novo, criar o logo, escolher um e
 * recomeçar. Cada action confere o acesso, reserva o que custa, chama quem conversa ou quem
 * desenha, guarda (sempre acrescentando, nunca regravando) e devolve a tela pronta. Quando a IA
 * falha, a mensagem dela fica guardada e a tela mostra um aviso com "Tentar de novo".
 */

export type ChatResult = {
  chat: ChatView;
  error?: string;
  /** Escolheu o logo: a tela vai pra cá (sem redirect na action, que a tela leria como erro). */
  next?: string;
};

const AI_DOWN = 'O assistente está com dificuldade agora. Toque em "Tentar de novo".';
const TOO_MANY = 'Você já conversou bastante por hoje. Escolha um dos logos ou volte mais tarde.';

async function chatContext() {
  const access = await requireBrandAction({ logo: true });
  // O logo vem depois do nome (a página já leva pra lá; aqui, por quem chama a action direto).
  if (!access.brand.name) redirect(brandStepPath('nome'));
  const context: InterviewContext = {
    storeName: access.brand.name,
    studentName: access.studentName,
    answers: access.answers,
  };
  return { ...access, context };
}

/**
 * Pede a próxima fala da IA pra conversa `chat` (que já termina na mensagem dela) e guarda a fala
 * (mais `pending`: o que ainda não estava guardado, como a mensagem dela).
 */
async function reply(
  userId: string,
  context: InterviewContext,
  chat: LogoChat,
  pending: LogoChatMessage[],
): Promise<ChatResult> {
  const opening = chat.messages[0];
  const options = opening?.role === 'assistant' ? { opening } : {};
  if (!(await reserveTurn(userId, MAX_TOTAL_TURNS))) {
    return { chat: view(await appendMessages(userId, pending, options)), error: TOO_MANY };
  }
  try {
    const turn = await nextAssistantTurn(context, chat.messages);
    const answer = assistantMessage(turn);
    const saved = await appendMessages(userId, [...pending, answer], {
      ...options,
      brief: turn.brief,
    });
    return { chat: view(saved) };
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
    console.error('[chat do logo]', error.message);
    // A mensagem dela fica guardada: ela não precisa escrever de novo.
    return { chat: view(await appendMessages(userId, pending, options)), error: AI_DOWN };
  }
}

export async function sendLogoMessage(text: string): Promise<ChatResult> {
  const { userId, context } = await chatContext();
  const chat = await currentChat(userId, context);
  const message = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
  if (!message) return { chat: view(chat), error: 'Escreva uma mensagem.' };
  if (userMessageCount(chat) >= MAX_USER_MESSAGES) {
    return {
      chat: view(chat),
      error: 'A conversa já está bem completa. Toque em "Criar meu logo" ou recomece.',
    };
  }
  const mine: LogoChatMessage = { role: 'user', text: message };
  return reply(userId, context, { ...chat, messages: [...chat.messages, mine] }, [mine]);
}

/** "Tentar de novo": a IA responde à última mensagem dela, que ficou sem resposta. */
export async function retryLogoReply(): Promise<ChatResult> {
  const { userId, context } = await chatContext();
  const chat = await currentChat(userId, context);
  if (chat.messages.at(-1)?.role !== 'user') return { chat: view(chat) };
  return reply(userId, context, chat, []);
}

/** Cria um logo com o resumo da conversa (dentro do limite de criações). */
export async function createLogo(): Promise<ChatResult> {
  const { userId, context } = await chatContext();
  const chat = await currentChat(userId, context);
  if (!chat.brief) {
    return { chat: view(chat), error: 'Me conta mais um pouco antes de criar o logo.' };
  }
  if (!(await reserveGeneration(userId, MAX_GENERATIONS))) {
    return {
      chat: view(chat),
      error: `Você já criou ${MAX_GENERATIONS} logos. Escolha um deles pra seguir.`,
    };
  }
  let png: Uint8Array;
  try {
    png = await drawLogo(chat.brief, context.storeName);
  } catch (error) {
    // A imagem não saiu: a criação volta pra ela (nada foi pago).
    await releaseGeneration(userId);
    if (!(error instanceof AiUnavailableError)) throw error;
    console.error('[logo]', error.message);
    return {
      chat: view(chat),
      error: 'Não consegui criar o logo agora. Tente de novo daqui a pouco.',
    };
  }
  // Daqui pra frente a imagem já foi paga: uma falha ao guardar não devolve a criação.
  const key = await storeLogoImage(userId, png);
  const opening = chat.messages[0];
  const saved = await appendMessages(
    userId,
    [
      {
        role: 'assistant',
        text: 'Prontinho! Gostou? Se quiser, me diga o que mudar e eu crio outro.',
        image: key,
      },
    ],
    opening?.role === 'assistant' ? { opening } : {},
  );
  return { chat: view(saved) };
}

/** Escolhe um logo da conversa: vira o logo da loja e ela segue (ou volta pra revisão). */
export async function chooseLogo(imageId: string, editing: boolean): Promise<ChatResult> {
  const { userId, context, revising, logoOnly } = await chatContext();
  const chat = await currentChat(userId, context);
  let key: string | null = null;
  try {
    key = logoImageKey(userId, imageId);
  } catch {
    key = null;
  }
  // Só um logo que saiu nesta conversa (nada de chave inventada).
  if (!key || !chat.messages.some((message) => message.image === key)) {
    return { chat: view(chat), error: 'Esse logo não está mais aqui. Escolha outro.' };
  }
  await saveBrand(userId, { logoImage: key });
  const next = logoOnly
    ? '/loja-pronta'
    : brandStepPath(editing || revising ? 'revisao' : 'descricao');
  return { chat: view(chat), next };
}

/** Recomeça a conversa do zero (os limites continuam contando). */
export async function restartLogoChat(): Promise<ChatResult> {
  const { userId, context } = await chatContext();
  await clearLogoChat(userId);
  return { chat: view(await currentChat(userId, context)) };
}

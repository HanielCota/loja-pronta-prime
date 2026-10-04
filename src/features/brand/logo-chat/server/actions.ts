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
  MAX_UPLOAD_BYTES,
  MAX_USER_MESSAGES,
  userMessageCount,
  type LogoChat,
  type LogoChatMessage,
} from '../model';
import {
  addBriefTweak,
  appendMessages,
  clearLogoChat,
  releaseGeneration,
  reserveGeneration,
  reserveTurn,
} from './chat-store';
import { nextAssistantTurn } from './interviewer';
import { currentChat, view } from './load';
import { isLastingTweak, isLogoTweak, LOGO_TWEAKS } from '../tweaks';
import { drawLogo, logoImageKey, normalizeUploadedLogo, storeLogoImage } from './logo-images';

/**
 * O chat do logo: mandar mensagem, tentar a resposta de novo, criar o logo (ou um ajuste dele),
 * mandar o próprio logo, escolher um e recomeçar. Cada action confere o acesso, reserva o que custa, chama quem conversa ou quem
 * desenha, guarda (sempre acrescentando, nunca regravando) e devolve a tela pronta. Quando a IA
 * falha, a mensagem dela fica guardada e a tela mostra um aviso com "Tentar de novo".
 */

export type ChatResult = {
  chat: ChatView;
  error?: string;
  /** Escolheu o logo: a tela vai pra cá (sem redirect na action, que a tela leria como erro). */
  next?: string;
  /**
   * A mensagem dela ficou guardada (só no mandar mensagem). Sem isso, o texto volta pro campo. Não
   * dá pra conferir pelo texto: o servidor junta os espaços, e ela pode repetir uma mensagem.
   */
  saved?: boolean;
  /** Acabaram as respostas da IA: "Tentar de novo" não adianta mais (criar e ajustar ainda dá). */
  limited?: boolean;
};

const AI_DOWN = 'O assistente está com dificuldade agora. Toque em "Tentar de novo".';
const TOO_MANY = 'Você já conversou bastante por hoje. Escolha um dos logos ou volte mais tarde.';

/** A primeira fala, pra guardar junto se a conversa ainda está vazia no banco. */
function openingOf(chat: LogoChat): { opening?: LogoChatMessage } {
  const opening = chat.messages[0];
  return opening?.role === 'assistant' ? { opening } : {};
}

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
  const options = openingOf(chat);
  if (!(await reserveTurn(userId, MAX_TOTAL_TURNS))) {
    // Nada guardado: guardada sem resposta, a mensagem dela prenderia a tela no "Tentar de novo"
    // (que só daria esse aviso de novo). O texto volta pro campo e criar/ajustar continua.
    const before = chat.messages.slice(0, chat.messages.length - pending.length);
    return {
      chat: view({ ...chat, messages: before }),
      error: TOO_MANY,
      saved: false,
      limited: true,
    };
  }
  try {
    const turn = await nextAssistantTurn(context, chat.messages, chat.brief);
    const answer = assistantMessage(turn);
    const saved = await appendMessages(userId, [...pending, answer], {
      ...options,
      brief: turn.brief,
    });
    return { chat: view(saved), saved: true };
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
    console.error('[chat do logo]', error.message);
    // A mensagem dela fica guardada: ela não precisa escrever de novo.
    return {
      chat: view(await appendMessages(userId, pending, options)),
      error: AI_DOWN,
      saved: true,
    };
  }
}

export async function sendLogoMessage(text: string): Promise<ChatResult> {
  const { userId, context } = await chatContext();
  const chat = await currentChat(userId, context);
  const message = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
  if (!message) return { chat: view(chat), error: 'Escreva uma mensagem.', saved: false };
  if (userMessageCount(chat) >= MAX_USER_MESSAGES) {
    return {
      chat: view(chat),
      error: 'A conversa já está bem completa. Toque em "Criar meu logo" ou recomece.',
      saved: false,
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

/**
 * Cria um logo com o resumo da conversa (dentro do limite de criações). Com `tweak` (um ajuste
 * de um toque, como "Mais colorido"), o pedido dela entra na conversa e o ajuste vai pra imagem.
 */
export async function createLogo(tweak?: string): Promise<ChatResult> {
  const { userId, context } = await chatContext();
  const chat = await currentChat(userId, context);
  if (tweak !== undefined && !isLogoTweak(tweak)) return { chat: view(chat) };
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
    png = await drawLogo(chat.brief, context.storeName, tweak);
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
  const asked: LogoChatMessage[] = tweak ? [{ role: 'user', text: LOGO_TWEAKS[tweak].label }] : [];
  // O ajuste vai pro resumo como ele está agora (não o lido antes da criação): ver addBriefTweak.
  if (tweak && isLastingTweak(tweak)) await addBriefTweak(userId, tweak);
  const saved = await appendMessages(
    userId,
    [
      ...asked,
      {
        role: 'assistant',
        text: tweak
          ? 'Fiz a versão nova! Compare com os outros e escolha o seu.'
          : // "Ajuste", sem dizer onde: no computador ele fica ao lado; no celular, embaixo.
            'Seu logo chegou! Gostou? Toque num ajuste ou me diga o que mudar.',
        image: key,
      },
    ],
    openingOf(chat),
  );
  return { chat: view(saved) };
}

/**
 * "Já tenho um logo": ela manda a imagem dela, que entra na conversa pra ela escolher, como um
 * logo criado (sem gastar criação; conta como uma resposta, pra segurar abuso).
 */
export async function uploadLogo(form: FormData): Promise<ChatResult> {
  const { userId, context } = await chatContext();
  const chat = await currentChat(userId, context);
  const file = form.get('logo');
  if (!(file instanceof File) || file.size === 0) {
    return { chat: view(chat), error: 'Escolha a imagem do seu logo.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { chat: view(chat), error: 'Essa imagem é grande demais. Tente outra.' };
  }
  const png = await normalizeUploadedLogo(new Uint8Array(await file.arrayBuffer()));
  if (!png) {
    return {
      chat: view(chat),
      error: 'Não consegui abrir essa imagem. Mande uma foto ou imagem (PNG ou JPG).',
    };
  }
  if (!(await reserveTurn(userId, MAX_TOTAL_TURNS))) {
    return { chat: view(chat), error: TOO_MANY, limited: true };
  }
  const key = await storeLogoImage(userId, png);
  const saved = await appendMessages(
    userId,
    [
      { role: 'user', text: 'Mandei o meu logo.' },
      {
        role: 'assistant',
        text: 'Recebi o seu logo! Se estiver tudo certo, toque em "Usar esse logo".',
        image: key,
        uploaded: true,
      },
    ],
    openingOf(chat),
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

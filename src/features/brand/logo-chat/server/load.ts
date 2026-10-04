import { toChatView, withOpening, type ChatView } from '../chat-view';
import type { InterviewContext } from '../interviewer-prompt';
import type { LogoChat } from '../model';
import { getLogoChat } from './chat-store';
import { openingTurn } from './interviewer';
import { imageIdFromKey } from './logo-images';

/** A conversa guardada, como a tela abre (com a primeira fala, se ainda está vazia). */
export async function currentChat(userId: string, context: InterviewContext): Promise<LogoChat> {
  return withOpening(await getLogoChat(userId), openingTurn, context);
}

/** A conversa como a tela recebe (com o id das imagens, não a chave guardada). */
export function view(chat: LogoChat): ChatView {
  return toChatView(chat, imageIdFromKey);
}

/** A conversa como a página abre. */
export async function loadChatView(userId: string, context: InterviewContext): Promise<ChatView> {
  return view(await currentChat(userId, context));
}

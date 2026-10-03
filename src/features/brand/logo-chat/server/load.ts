import { toChatView, withOpening, type ChatView } from '../chat-view';
import type { InterviewContext } from '../interviewer-prompt';
import { getLogoChat } from './chat-store';
import { openingTurn } from './interviewer';
import { imageIdFromKey } from './logo-images';

/** A conversa como a tela abre (com a primeira fala, se ainda está vazia). */
export async function loadChatView(userId: string, context: InterviewContext): Promise<ChatView> {
  const chat = withOpening(await getLogoChat(userId), openingTurn, context);
  return toChatView(chat, imageIdFromKey);
}

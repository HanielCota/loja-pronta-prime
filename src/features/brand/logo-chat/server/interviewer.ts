import { env } from '@/config/env';
import { deepseekJsonChat, type ChatMessage, type JsonChat } from '@/server/ai/chat';
import { FALLBACK_TURN, parseAssistantTurn, serializeAssistantTurn } from '../assistant-turn';
import { interviewerSystemPrompt, type InterviewContext } from '../interviewer-prompt';
import { HISTORY_WINDOW, type AssistantTurn, type LogoChatMessage } from '../model';
import { fakeJsonChat } from './fake-ai';

/** O modelo de texto em uso: o DeepSeek, ou o de mentira nos testes. */
function chatModel(): JsonChat {
  return env.AI_FAKE === '1' ? fakeJsonChat : deepseekJsonChat;
}

/** Tentativas quando a IA devolve algo fora do formato (às vezes vem só espaço em branco). */
const ATTEMPTS = 2;

/**
 * A próxima fala do chat: as instruções (com o que ela já contou), as últimas mensagens e a
 * resposta da IA já conferida. As falas do assistente vão no mesmo JSON que ele deve responder;
 * logo criado vai como texto ("[logo criado...]"), sem a chave.
 */
export async function nextAssistantTurn(
  context: InterviewContext,
  messages: LogoChatMessage[],
): Promise<AssistantTurn> {
  const history: ChatMessage[] = messages.slice(-HISTORY_WINDOW).map((message) =>
    message.role === 'user'
      ? { role: 'user', content: message.text }
      : {
          role: 'assistant',
          content: serializeAssistantTurn({
            reply: message.image
              ? `[logo criado e mostrado pra ela] ${message.text}`
              : message.text,
            suggestions: message.suggestions ?? [],
            brief: null,
          }),
        },
  );
  const prompt: ChatMessage[] = [
    { role: 'system', content: interviewerSystemPrompt(context) },
    ...history,
  ];
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const raw = await chatModel()(prompt);
    const turn = parseAssistantTurn(raw);
    if (turn) return turn;
    // Só o tamanho: o texto pode repetir o que ela escreveu.
    console.warn(`[chat do logo] resposta fora do formato (${raw.length} caracteres)`);
  }
  return FALLBACK_TURN;
}

/** A primeira fala, sem chamar a IA (aparece na hora e não custa nada). */
export function openingTurn({ storeName, studentName }: InterviewContext): AssistantTurn {
  const first = studentName.trim().split(/\s+/)[0];
  return {
    reply: `Oi${first ? `, ${first}` : ''}! Vamos criar o logo da ${storeName}? Me conta: você imagina um desenho no logo, ou só o nome escrito bonito?`,
    suggestions: ['Um desenho', 'Só o nome', 'Me ajuda a escolher'],
    brief: null,
  };
}

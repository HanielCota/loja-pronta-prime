import type { InterviewContext } from './interviewer-prompt';
import {
  LOGO_TOPIC_IDS,
  LOGO_TOPICS,
  MAX_GENERATIONS,
  type AssistantTurn,
  type LogoChat,
  type LogoChatMessage,
  type LogoTopic,
} from './model';

/**
 * O que a tela do chat recebe: as mensagens (com o id da imagem, não a chave guardada), se já dá
 * pra criar o logo e quantas criações ainda restam. Funções puras.
 */

export type ChatViewMessage = {
  role: LogoChatMessage['role'];
  text: string;
  suggestions?: string[];
  /** O id do logo (a imagem vem de marca/imagens/<id>). */
  imageId?: string;
  /** O logo foi ela que mandou (sem ajustes de um toque: eles redesenham pela IA). */
  uploaded?: boolean;
  /** O assunto da pergunta da assistente (Desenho, Cores...). */
  topic?: LogoTopic;
};

export type ChatView = {
  messages: ChatViewMessage[];
  /** A conversa já tem o resumo: aparece "Criar meu logo". */
  ready: boolean;
  /** O resumo do logo pra ela conferir antes de criar (vazio sem resumo). */
  summary: { label: string; value: string }[];
  generationsLeft: number;
};

export function assistantMessage(turn: AssistantTurn): LogoChatMessage {
  return {
    role: 'assistant',
    text: turn.reply,
    ...(turn.suggestions.length ? { suggestions: turn.suggestions } : {}),
    ...(turn.topic ? { topic: turn.topic } : {}),
  };
}

/** Uma resposta dela, numa etiqueta: o assunto ("Cores") e o que ela respondeu ("rosa"). */
export type TopicAnswer = { topic: LogoTopic; label: string; answer: string };

/**
 * As respostas dela, uma por assunto (vale a última), na ordem do resumo: cada mensagem dela
 * responde ao assunto da pergunta da assistente logo antes.
 */
export function topicAnswers(messages: ChatViewMessage[]): TopicAnswer[] {
  const answers = new Map<LogoTopic, string>();
  messages.forEach((message, index) => {
    const asked = messages[index - 1];
    if (message.role === 'user' && asked?.role === 'assistant' && asked.topic) {
      answers.set(asked.topic, message.text);
    }
  });
  return LOGO_TOPIC_IDS.flatMap((topic) => {
    const answer = answers.get(topic);
    return answer ? [{ topic, label: LOGO_TOPICS[topic].label, answer }] : [];
  });
}

/** A conversa com a primeira fala quando ainda está vazia (a primeira fala não custa nada). */
export function withOpening(
  chat: LogoChat,
  opening: (context: InterviewContext) => AssistantTurn,
  context: InterviewContext,
): LogoChat {
  return chat.messages.length ? chat : { ...chat, messages: [assistantMessage(opening(context))] };
}

export function toChatView(
  chat: LogoChat,
  imageIdFromKey: (key: string) => string | null,
): ChatView {
  const { brief } = chat;
  return {
    messages: chat.messages.map((message) => {
      const imageId = message.image ? imageIdFromKey(message.image) : null;
      return {
        role: message.role,
        text: message.text,
        ...(message.suggestions ? { suggestions: message.suggestions } : {}),
        ...(imageId ? { imageId } : {}),
        ...(imageId && message.uploaded ? { uploaded: true } : {}),
        ...(message.topic ? { topic: message.topic } : {}),
      };
    }),
    ready: Boolean(brief),
    summary: brief
      ? [
          { label: 'Desenho', value: brief.symbol },
          { label: 'Cores', value: brief.colors },
          { label: 'Letras', value: brief.lettering },
          { label: 'Fundo', value: brief.background },
          { label: 'Estilo', value: brief.look === 'realista' ? 'realista' : 'ilustração' },
        ]
      : [],
    generationsLeft: Math.max(0, MAX_GENERATIONS - chat.generations),
  };
}

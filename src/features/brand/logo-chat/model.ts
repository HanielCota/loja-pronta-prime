import { z } from 'zod';

/**
 * O chat do logo: os tipos e os limites. A conversa fica guardada (ela sai e volta de onde parou);
 * os limites seguram o custo e o tamanho do que vai pra IA.
 */

/** O que ela pode escrever numa mensagem. */
export const MAX_MESSAGE_CHARS = 400;
/** Mensagens dela numa conversa: depois disso, o chat pede pra criar o logo. */
export const MAX_USER_MESSAGES = 30;
/**
 * Respostas da IA por aluna, somando todas as conversas (recomeçar não zera): segura o custo
 * mesmo de quem recomeça sem parar. Dá pra umas 4 conversas inteiras.
 */
export const MAX_TOTAL_TURNS = 120;
/** Quantas mensagens recentes vão pra IA a cada resposta (as antigas ficam só na tela). */
export const HISTORY_WINDOW = 16;
/** Logos que ela pode gerar (cada um custa): o bastante pra escolher, sem gasto sem fim. */
export const MAX_GENERATIONS = 4;
/** Respostas rápidas que o chat oferece (os botões embaixo da mensagem). */
export const MAX_SUGGESTIONS = 4;

/** Texto curto vindo da IA: sem quebra de linha, sem aspas, sem espaço sobrando. */
const short = (max: number) =>
  z
    .string()
    .transform((value) =>
      value
        .replace(/[\r\n"“”`<>]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max),
    )
    .pipe(z.string().min(1));

/**
 * O resumo do logo que a conversa monta: o que vai pra imagem. Em português (ela vê o resumo antes
 * de criar). `look`: ilustração (o padrão, lê bem pequeno) ou realista (foto, 3D).
 */
export const logoBriefSchema = z.object({
  symbol: short(120),
  colors: short(120),
  lettering: short(80),
  mood: short(120),
  background: short(80),
  look: z.enum(['ilustracao', 'realista']).catch('ilustracao'),
  extras: short(200).optional().catch(undefined),
});
export type LogoBrief = z.infer<typeof logoBriefSchema>;

/** Uma mensagem guardada. `image`: a chave do logo gerado, quando a mensagem é ele. */
export const chatMessageSchema = z.object({
  role: z.enum(['assistant', 'user']),
  text: z.string().max(2000),
  suggestions: z.array(z.string().max(80)).max(MAX_SUGGESTIONS).optional(),
  image: z.string().max(200).optional(),
});
export type LogoChatMessage = z.infer<typeof chatMessageSchema>;

/** A conversa inteira, como fica no banco. */
export type LogoChat = {
  messages: LogoChatMessage[];
  /** O resumo, quando a conversa já tem o bastante pra criar o logo. */
  brief: LogoBrief | null;
  /** Quantos logos ela já gerou. */
  generations: number;
};

export const EMPTY_CHAT: LogoChat = { messages: [], brief: null, generations: 0 };

/** O que a IA responde a cada vez (já conferido): a fala, as respostas rápidas e o resumo. */
export type AssistantTurn = {
  reply: string;
  suggestions: string[];
  /** Com o resumo, a conversa tem o bastante: aparece "Criar meu logo". */
  brief: LogoBrief | null;
};

export function userMessageCount(chat: LogoChat): number {
  return chat.messages.filter((message) => message.role === 'user').length;
}

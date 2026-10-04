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
/** O logo que ela manda: até 5 MB (a tela já reduz pra 1024px antes de mandar). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Os assuntos das perguntas, na ordem do resumo: a tela mostra "Pergunta 2 de 5" e as respostas
 * dela em etiquetas ("Cores: rosa"). `change`: o pedido pra mudar a resposta (tocar na etiqueta).
 */
export const LOGO_TOPICS = {
  desenho: { label: 'Desenho', change: 'Quero mudar o desenho' },
  cores: { label: 'Cores', change: 'Quero mudar as cores' },
  letras: { label: 'Letras', change: 'Quero mudar as letras' },
  fundo: { label: 'Fundo', change: 'Quero mudar o fundo' },
  estilo: { label: 'Estilo', change: 'Quero mudar o estilo' },
} as const;
export type LogoTopic = keyof typeof LOGO_TOPICS;
export const LOGO_TOPIC_IDS = Object.keys(LOGO_TOPICS) as LogoTopic[];
export const logoTopicSchema = z.enum(LOGO_TOPIC_IDS as [LogoTopic, ...LogoTopic[]]);

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
  /** Ajustes de um toque que continuam valendo (ver tweaks.ts). Só o sistema põe. */
  tweaks: z
    .array(z.enum(['mais-colorido', 'letra-maior', 'mais-simples']))
    .max(3)
    .optional()
    .catch(undefined),
});
export type LogoBrief = z.infer<typeof logoBriefSchema>;

/**
 * Uma mensagem guardada. `image`: a chave do logo, quando a mensagem é ele; `uploaded`: o logo
 * foi ela que mandou (não a IA que criou); `topic`: o assunto da pergunta da assistente.
 */
export const chatMessageSchema = z.object({
  role: z.enum(['assistant', 'user']),
  text: z.string().max(2000),
  suggestions: z.array(z.string().max(80)).max(MAX_SUGGESTIONS).optional(),
  image: z.string().max(200).optional(),
  uploaded: z.literal(true).optional(),
  topic: logoTopicSchema.optional().catch(undefined),
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

/**
 * O que a IA responde a cada vez (já conferido): a fala, as respostas rápidas, o assunto da
 * pergunta (nulo quando não é de um dos 5) e o resumo.
 */
export type AssistantTurn = {
  reply: string;
  suggestions: string[];
  topic: LogoTopic | null;
  /** Com o resumo, a conversa tem o bastante: aparece "Criar meu logo". */
  brief: LogoBrief | null;
};

export function userMessageCount(chat: LogoChat): number {
  return chat.messages.filter((message) => message.role === 'user').length;
}

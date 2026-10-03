import { and, eq, lt, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { logoChat } from '@/server/db/schema';
import {
  chatMessageSchema,
  EMPTY_CHAT,
  logoBriefSchema,
  type LogoBrief,
  type LogoChat,
  type LogoChatMessage,
} from '../model';

/**
 * A conversa do logo no banco: ler, acrescentar mensagens e reservar o que custa (respostas da IA
 * e logos). Só guarda e devolve; quem decide o que muda é quem chama (as actions).
 *
 * Mensagens novas entram sempre no fim da lista guardada (nunca regravando a lista lida antes):
 * duas abas ao mesmo tempo, ou uma criação de 15 segundos no meio de uma conversa, não apagam
 * nada uma da outra.
 */

const messagesSchema = z.array(chatMessageSchema).catch([]);

export async function getLogoChat(userId: string): Promise<LogoChat> {
  const [row] = await db
    .select({
      messages: logoChat.messages,
      brief: logoChat.brief,
      generations: logoChat.generations,
    })
    .from(logoChat)
    .where(eq(logoChat.userId, userId));
  if (!row) return EMPTY_CHAT;
  const brief = logoBriefSchema.safeParse(row.brief);
  return {
    messages: messagesSchema.parse(row.messages),
    brief: brief.success ? brief.data : null,
    generations: row.generations,
  };
}

/**
 * Acrescenta mensagens no fim da conversa guardada. `opening`: a primeira fala, que entra antes
 * só se a conversa ainda está vazia (ela nasce na tela, sem custo, e é guardada na primeira
 * mensagem dela). `brief`: o resumo novo, quando a IA mandou um.
 */
export async function appendMessages(
  userId: string,
  messages: LogoChatMessage[],
  { opening, brief }: { opening?: LogoChatMessage; brief?: LogoBrief | null } = {},
) {
  const added = sql`${JSON.stringify(messages)}::jsonb`;
  const withOpening = opening
    ? sql`case when jsonb_array_length(${logoChat.messages}) = 0 then ${JSON.stringify([opening])}::jsonb else '[]'::jsonb end`
    : sql`'[]'::jsonb`;
  const set: { messages: SQL; brief?: LogoBrief } = {
    messages: sql`${logoChat.messages} || ${withOpening} || ${added}`,
  };
  if (brief) set.brief = brief;
  await db.insert(logoChat).values({ userId }).onConflictDoNothing();
  await db.update(logoChat).set(set).where(eq(logoChat.userId, userId));
}

/**
 * Reserva uma unidade de `column` (respostas da IA ou logos) antes de chamar a IA, numa só
 * instrução: cliques ao mesmo tempo não passam do limite. Devolve se conseguiu.
 */
async function reserve(
  userId: string,
  column: typeof logoChat.generations | typeof logoChat.turns,
  max: number,
) {
  await db.insert(logoChat).values({ userId }).onConflictDoNothing();
  const reserved = await db
    .update(logoChat)
    .set(
      column === logoChat.turns
        ? { turns: sql`${column} + 1` }
        : { generations: sql`${column} + 1` },
    )
    .where(and(eq(logoChat.userId, userId), lt(column, max)))
    .returning({ userId: logoChat.userId });
  return reserved.length > 0;
}

/** Uma resposta da IA (o limite vale pra sempre: recomeçar a conversa não zera). */
export function reserveTurn(userId: string, max: number): Promise<boolean> {
  return reserve(userId, logoChat.turns, max);
}

/** Um logo (o limite vale pra sempre). */
export function reserveGeneration(userId: string, max: number): Promise<boolean> {
  return reserve(userId, logoChat.generations, max);
}

/** Devolve o logo reservado quando a IA não desenhou nada (ela não pagou por nada). */
export async function releaseGeneration(userId: string) {
  await db
    .update(logoChat)
    .set({ generations: sql`greatest(${logoChat.generations} - 1, 0)` })
    .where(eq(logoChat.userId, userId));
}

/** Recomeça a conversa (os limites continuam contando: são por aluna). */
export async function clearLogoChat(userId: string) {
  await db.update(logoChat).set({ messages: [], brief: null }).where(eq(logoChat.userId, userId));
}

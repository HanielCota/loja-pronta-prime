import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { logoChat } from '@/server/db/schema';
import type { LastingTweak } from '../tweaks';
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
 * nada uma da outra. Cada operação é uma instrução só (insere a linha se ainda não existe).
 */

const messagesSchema = z.array(chatMessageSchema).catch([]);

type ChatRow = { messages: unknown; brief: unknown; generations: number };

const CHAT_COLUMNS = {
  messages: logoChat.messages,
  brief: logoChat.brief,
  generations: logoChat.generations,
};

function toChat(row: ChatRow | undefined): LogoChat {
  if (!row) return EMPTY_CHAT;
  const brief = logoBriefSchema.safeParse(row.brief);
  return {
    messages: messagesSchema.parse(row.messages),
    brief: brief.success ? brief.data : null,
    generations: row.generations,
  };
}

export async function getLogoChat(userId: string): Promise<LogoChat> {
  const [row] = await db.select(CHAT_COLUMNS).from(logoChat).where(eq(logoChat.userId, userId));
  return toChat(row);
}

/**
 * Acrescenta mensagens no fim da conversa guardada e devolve a conversa como ficou. `opening`: a
 * primeira fala, que entra antes só se a conversa ainda está vazia (ela nasce na tela, sem custo,
 * e é guardada na primeira mensagem dela). `brief`: o resumo novo, quando a IA mandou um. Os
 * ajustes de um toque continuam: a IA não manda os ajustes, então eles vêm do resumo guardado
 * agora (não do lido antes da IA responder, que outra aba pode ter mudado).
 */
export async function appendMessages(
  userId: string,
  messages: LogoChatMessage[],
  { opening, brief }: { opening?: LogoChatMessage | undefined; brief?: LogoBrief | null } = {},
): Promise<LogoChat> {
  const fresh = [...(opening ? [opening] : []), ...messages];
  const added = sql`${JSON.stringify(messages)}::jsonb`;
  const withOpening = opening
    ? sql`case when jsonb_array_length(${logoChat.messages}) = 0 then ${JSON.stringify([opening])}::jsonb else '[]'::jsonb end`
    : sql`'[]'::jsonb`;
  // Sem resumo guardado (ou sem ajustes), o "tweaks" nulo some e fica só o resumo novo.
  const keepingTweaks = brief
    ? sql`${JSON.stringify(brief)}::jsonb || coalesce(jsonb_strip_nulls(jsonb_build_object('tweaks', ${logoChat.brief} -> 'tweaks')), '{}'::jsonb)`
    : null;
  const [row] = await db
    .insert(logoChat)
    .values({ userId, messages: fresh, ...(brief ? { brief } : {}) })
    .onConflictDoUpdate({
      target: logoChat.userId,
      set: {
        messages: sql`${logoChat.messages} || ${withOpening} || ${added}`,
        ...(keepingTweaks ? { brief: keepingTweaks } : {}),
      },
    })
    .returning(CHAT_COLUMNS);
  return toChat(row);
}

/**
 * Guarda um ajuste de um toque no resumo como ele está agora no banco (numa só instrução): a
 * criação leva até 1 minuto, e nesse meio outra aba pode ter trocado o resumo ou recomeçado a
 * conversa. Sem resumo (recomeçou), não faz nada; ajuste repetido também não.
 */
export async function addBriefTweak(userId: string, tweak: LastingTweak) {
  const tweaks = sql`coalesce(${logoChat.brief} -> 'tweaks', '[]'::jsonb)`;
  const added = sql`jsonb_build_array(${tweak}::text)`;
  await db
    .update(logoChat)
    .set({ brief: sql`jsonb_set(${logoChat.brief}, '{tweaks}', ${tweaks} || ${added})` })
    .where(
      sql`${logoChat.userId} = ${userId} and jsonb_typeof(${logoChat.brief}) = 'object' and not ${tweaks} @> ${added}`,
    );
}

/**
 * Reserva uma unidade de `column` (respostas da IA ou logos) antes de chamar a IA, numa só
 * instrução: cliques ao mesmo tempo não passam do limite. Devolve se conseguiu.
 */
async function reserve(column: 'turns' | 'generations', userId: string, max: number) {
  const target = logoChat[column];
  const reserved = await db
    .insert(logoChat)
    .values({ userId, [column]: 1 })
    .onConflictDoUpdate({
      target: logoChat.userId,
      set: { [column]: sql`${target} + 1` },
      setWhere: sql`${target} < ${max}`,
    })
    .returning({ userId: logoChat.userId });
  return reserved.length > 0;
}

/** Uma resposta da IA (o limite vale pra sempre: recomeçar a conversa não zera). */
export function reserveTurn(userId: string, max: number): Promise<boolean> {
  return reserve('turns', userId, max);
}

/** Um logo (o limite vale pra sempre). */
export function reserveGeneration(userId: string, max: number): Promise<boolean> {
  return reserve('generations', userId, max);
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

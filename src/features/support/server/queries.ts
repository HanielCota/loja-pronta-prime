import { and, asc, count, desc, eq, gt, ilike, isNotNull, isNull, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningLessons,
  supportFaqAnswers,
  supportKnownIssues,
  supportTicketAttachments,
  supportTicketEvents,
  supportTicketMessages,
  supportTicketReads,
  supportTickets,
  user,
} from '@/server/db/schema';
import { TICKET_STATUSES, type TicketStatus } from '../ticket-rules';
import type { SupportAnswer } from '../faq';
import { loadSupportSettings } from './settings';
import type { TicketRow } from './tickets';
import type { RequesterThread } from '../thread';

export const MY_TICKETS_PAGE_SIZE = 10;

/**
 * O id do chamado sempre com o nome da tabela. Num SELECT de uma tabela só o Drizzle escreve só
 * `"id"`, e dentro da subconsulta isso vira o id da mensagem: o "não lido" nunca acendia.
 * A leitura guarda milissegundos (vem de um `Date`), a mensagem guarda microssegundos: a comparação
 * corta a mensagem pra mesma precisão, senão a última mensagem lida continuava "nova".
 */
const TICKET_ID = sql`${sql.identifier('support_tickets')}.${sql.identifier('id')}`;

/** Tem resposta da equipe (não nota interna) mais nova que a leitura da aluna. */
function unreadForRequester(userId: string): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${supportTicketMessages} m
    where m.ticket_id = ${TICKET_ID} and m.from_staff = true and m.internal = false
      and date_trunc('milliseconds', m.created_at) > coalesce((
        select r.read_at from ${supportTicketReads} r
        where r.ticket_id = ${TICKET_ID} and r.user_id = ${userId}
      ), 'epoch'::timestamp)
  )`;
}

/** Os chamados dela que aparecem na conta: os da plataforma e os públicos já confirmados. */
function mine(userId: string) {
  return and(eq(supportTickets.requesterId, userId), isNotNull(supportTickets.emailConfirmedAt));
}

export type MyTicketFilters = { q: string; status: TicketStatus | ''; page: number };

export function parseMyTicketFilters(params: URLSearchParams): MyTicketFilters {
  const status = params.get('status') ?? '';
  const page = Number.parseInt(params.get('pagina') ?? '1', 10);
  return {
    q: (params.get('q') ?? '').trim().slice(0, 120),
    status: (TICKET_STATUSES as readonly string[]).includes(status) ? (status as TicketStatus) : '',
    page: Number.isInteger(page) && page > 0 && page < 1000 ? page : 1,
  };
}

export async function listMyTickets(userId: string, filters: MyTicketFilters) {
  const where = and(
    mine(userId),
    filters.q ? ilike(supportTickets.subject, `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
    filters.status ? eq(supportTickets.status, filters.status) : undefined,
  );
  const [rows, [total]] = await Promise.all([
    db
      .select({
        number: supportTickets.number,
        subject: supportTickets.subject,
        status: supportTickets.status,
        updatedAt: supportTickets.updatedAt,
        unread: unreadForRequester(userId),
      })
      .from(supportTickets)
      .where(where)
      .orderBy(desc(supportTickets.updatedAt))
      .limit(MY_TICKETS_PAGE_SIZE)
      .offset((filters.page - 1) * MY_TICKETS_PAGE_SIZE),
    db.select({ total: count() }).from(supportTickets).where(where),
  ]);
  const totalCount = total?.total ?? 0;
  return { rows, total: totalCount, pages: Math.max(1, Math.ceil(totalCount / MY_TICKETS_PAGE_SIZE)) };
}

/** Quantos chamados dela têm resposta nova (o número do menu da conta). */
export async function countMyUnread(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(supportTickets)
    .where(and(mine(userId), unreadForRequester(userId)));
  return row?.total ?? 0;
}

/** Chamados abertos dela, pro aviso "Você já tem um chamado sobre isso". */
export async function listMyOpenTickets(userId: string) {
  return db
    .select({
      number: supportTickets.number,
      subject: supportTickets.subject,
      topicId: supportTickets.topicId,
      situationId: supportTickets.situationId,
    })
    .from(supportTickets)
    .where(and(mine(userId), ne(supportTickets.status, 'closed')))
    .orderBy(desc(supportTickets.updatedAt));
}

export async function getMyTicket(number: number, userId: string) {
  if (!Number.isInteger(number) || number < 1) return null;
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.number, number), mine(userId)))
    .limit(1);
  if (!ticket) return null;
  return loadRequesterThread(ticket);
}

/** A conversa como a aluna vê: sem notas internas, com nomes dos eventos e o "visto pelo suporte". */
export async function loadRequesterThread(ticket: TicketRow): Promise<RequesterThread> {
  const [messages, attachments, events, staffRead, lesson] = await Promise.all([
    db
      .select()
      .from(supportTicketMessages)
      .where(and(eq(supportTicketMessages.ticketId, ticket.id), eq(supportTicketMessages.internal, false)))
      .orderBy(asc(supportTicketMessages.createdAt)),
    db
      .select({ attachment: supportTicketAttachments })
      .from(supportTicketAttachments)
      .innerJoin(supportTicketMessages, eq(supportTicketMessages.id, supportTicketAttachments.messageId))
      .where(and(eq(supportTicketAttachments.ticketId, ticket.id), eq(supportTicketMessages.internal, false))),
    db
      .select({ event: supportTicketEvents, actorName: user.name, actorPreferred: user.preferredName })
      .from(supportTicketEvents)
      .leftJoin(user, eq(user.id, supportTicketEvents.actorId))
      .where(eq(supportTicketEvents.ticketId, ticket.id))
      .orderBy(asc(supportTicketEvents.id)),
    // A última leitura de alguém da equipe (qualquer pessoa): é o "Visto pelo suporte".
    db
      .select({ readAt: sql<Date>`max(${supportTicketReads.readAt})` })
      .from(supportTicketReads)
      .where(
        and(
          eq(supportTicketReads.ticketId, ticket.id),
          ticket.requesterId ? ne(supportTicketReads.userId, ticket.requesterId) : undefined,
        ),
      ),
    ticket.lessonId
      ? db
          .select({ title: learningLessons.title })
          .from(learningLessons)
          .where(eq(learningLessons.id, ticket.lessonId))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const names = await namesOf(events.flatMap(({ event }) => (event.type === 'assigned' && event.toValue ? [event.toValue] : [])));
  return {
    ticket,
    messages,
    attachments: attachments.map((row) => row.attachment),
    events: events.map(({ event, actorName, actorPreferred }) => ({
      ...event,
      actorName: actorPreferred?.trim() || actorName || null,
      targetName: event.toValue ? (names.get(event.toValue) ?? null) : null,
    })),
    staffReadAt: staffRead[0]?.readAt ? new Date(staffRead[0].readAt) : null,
    lessonTitle: lesson[0]?.title ?? null,
  };
}

export async function namesOf(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: user.id, name: user.name, preferredName: user.preferredName })
    .from(user)
    .where(sql`${user.id} in ${[...new Set(ids)]}`);
  return new Map(rows.map((row) => [row.id, row.preferredName?.trim() || row.name]));
}

export async function listActiveFaqAnswers(): Promise<SupportAnswer[]> {
  // As respostas de fábrica entram junto com as configurações, na primeira leitura.
  await loadSupportSettings();
  return db.select().from(supportFaqAnswers).where(eq(supportFaqAnswers.active, true));
}

export async function listActiveKnownIssues(now = new Date()) {
  return db
    .select({
      id: supportKnownIssues.id,
      title: supportKnownIssues.title,
      body: supportKnownIssues.body,
      topicIds: supportKnownIssues.topicIds,
    })
    .from(supportKnownIssues)
    .where(
      and(
        lte(supportKnownIssues.startsAt, now),
        or(isNull(supportKnownIssues.endsAt), gt(supportKnownIssues.endsAt, now)),
      ),
    )
    .orderBy(desc(supportKnownIssues.startsAt));
}

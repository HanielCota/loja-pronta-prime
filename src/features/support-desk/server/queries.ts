import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningLessonProgress,
  learningLessons,
  stores,
  studentProducts,
  supportReplyTemplates,
  supportTicketAttachments,
  supportTicketEvents,
  supportTicketMessages,
  supportTicketReads,
  supportTickets,
  user,
  userPresence,
} from '@/server/db/schema';
import { hasStaffPermission } from '@/features/support/staff-access';
import { canSeeQueue, loadStaffDirectory, type StaffMember } from '@/features/support/server/tickets';
import { getAccessValidity } from '@/features/products/server/access-validity';
import { visiblePresenceCondition } from '@/features/admin/server/presence-visibility';
import { STAFF_PAGE_SIZE, STAFF_QUEUES, type StaffQueue, type StaffTicketFilters } from '../filters';

export type Viewer = { id: string; role: string | null | undefined };

const ONLINE_WINDOW_MS = 90_000;

function escapeLike(value: string): string {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

/**
 * O id do chamado sempre com o nome da tabela. Num SELECT de uma tabela só o Drizzle escreve só
 * `"id"`, e dentro da subconsulta isso vira o id da mensagem: o "não lido" nunca acendia.
 * A leitura guarda milissegundos (vem de um `Date`), a mensagem guarda microssegundos: a comparação
 * corta a mensagem pra mesma precisão, senão a última mensagem lida continuava "nova".
 */
const TICKET_ID = sql`${sql.identifier('support_tickets')}.${sql.identifier('id')}`;

/** Tem mensagem da aluna mais nova que a leitura desta pessoa da equipe. */
function unreadForStaff(viewerId: string): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${supportTicketMessages} m
    where m.ticket_id = ${TICKET_ID} and m.from_staff = false
      and date_trunc('milliseconds', m.created_at) > coalesce((
        select r.read_at from ${supportTicketReads} r
        where r.ticket_id = ${TICKET_ID} and r.user_id = ${viewerId}
      ), 'epoch'::timestamp)
  )`;
}

function queueCondition(queue: StaffQueue, viewer: Viewer, activeStaffIds: string[], now: Date) {
  const general = eq(supportTickets.queue, 'general');
  const notClosed = ne(supportTickets.status, 'closed');
  const unassigned = activeStaffIds.length
    ? or(isNull(supportTickets.assigneeId), notInArray(supportTickets.assigneeId, activeStaffIds))
    : undefined;
  switch (queue) {
    case 'ouvidoria':
      return eq(supportTickets.queue, 'ombudsman');
    case 'sem-responsavel':
      return and(general, notClosed, unassigned);
    case 'minha':
      return and(general, notClosed, eq(supportTickets.assigneeId, viewer.id));
    case 'atrasados':
      return and(general, eq(supportTickets.status, 'open'), lt(supportTickets.dueAt, now));
    default:
      return general;
  }
}

function filterCondition(filters: StaffTicketFilters, activeStaffIds: string[]) {
  const pattern = escapeLike(filters.q);
  return and(
    filters.q
      ? or(
          ilike(supportTickets.subject, pattern),
          ilike(supportTickets.requesterName, pattern),
          ilike(supportTickets.requesterEmail, pattern),
          // A busca procura dentro das mensagens também (sem as notas internas? não: a equipe
          // escreveu as notas e quer achá-las).
          exists(
            db
              .select({ one: sql`1` })
              .from(supportTicketMessages)
              .where(
                and(
                  eq(supportTicketMessages.ticketId, supportTickets.id),
                  ilike(supportTicketMessages.body, pattern),
                ),
              ),
          ),
          /^#?\d+$/.test(filters.q)
            ? eq(supportTickets.number, Number(filters.q.replace('#', '')))
            : undefined,
        )
      : undefined,
    filters.status ? eq(supportTickets.status, filters.status) : undefined,
    filters.priority ? eq(supportTickets.priority, filters.priority) : undefined,
    filters.topic ? eq(supportTickets.topicId, filters.topic) : undefined,
    filters.channel ? eq(supportTickets.channel, filters.channel) : undefined,
    filters.product ? eq(supportTickets.product, filters.product) : undefined,
    filters.assignee === 'nenhum'
      ? activeStaffIds.length
        ? or(isNull(supportTickets.assigneeId), notInArray(supportTickets.assigneeId, activeStaffIds))
        : undefined
      : filters.assignee
        ? eq(supportTickets.assigneeId, filters.assignee)
        : undefined,
  );
}

const statusOrder = sql`case ${supportTickets.status} when 'open' then 0 when 'answered' then 1 else 2 end`;
const priorityOrder = sql`case ${supportTickets.priority} when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end`;

export async function listStaffTickets(
  viewer: Viewer,
  filters: StaffTicketFilters,
  now = new Date(),
  options: { all?: boolean } = {},
) {
  const staff = await loadStaffDirectory();
  const activeIds = staff.filter((member) => hasStaffPermission(member.role, 'support.answer')).map((member) => member.id);
  const where = and(queueCondition(filters.queue, viewer, activeIds, now), filterCondition(filters, activeIds));
  const offset = (filters.page - 1) * STAFF_PAGE_SIZE;
  const order =
    filters.queue === 'atrasados'
      ? [asc(supportTickets.dueAt)]
      : [asc(statusOrder), asc(priorityOrder), sql`${supportTickets.dueAt} asc nulls last`, desc(supportTickets.updatedAt)];
  const [rows, [total], counts] = await Promise.all([
    db
      .select({
        id: supportTickets.id,
        number: supportTickets.number,
        subject: supportTickets.subject,
        status: supportTickets.status,
        priority: supportTickets.priority,
        topicId: supportTickets.topicId,
        requesterName: supportTickets.requesterName,
        requesterEmail: supportTickets.requesterEmail,
        assigneeId: supportTickets.assigneeId,
        situationId: supportTickets.situationId,
        createdAt: supportTickets.createdAt,
        firstResponseAt: supportTickets.firstResponseAt,
        closedAt: supportTickets.closedAt,
        rating: supportTickets.rating,
        awaitingSince: supportTickets.awaitingSince,
        dueAt: supportTickets.dueAt,
        updatedAt: supportTickets.updatedAt,
        channel: supportTickets.channel,
        emailConfirmedAt: supportTickets.emailConfirmedAt,
        unread: unreadForStaff(viewer.id),
      })
      .from(supportTickets)
      .where(where)
      .orderBy(...order)
      // A exportação leva tudo (até o teto que a rota confere); a tela, uma página.
      .limit(options.all ? 10_001 : STAFF_PAGE_SIZE)
      .offset(options.all ? 0 : offset),
    db.select({ total: count() }).from(supportTickets).where(where),
    queueCounts(viewer, activeIds, now),
  ]);
  const nameOf = (id: string | null) => staff.find((member) => member.id === id)?.name ?? null;
  return {
    rows: rows.map((row) => ({
      ...row,
      assigneeName: activeIds.includes(row.assigneeId ?? '') ? nameOf(row.assigneeId) : null,
    })),
    total: total?.total ?? 0,
    pages: Math.max(1, Math.ceil((total?.total ?? 0) / STAFF_PAGE_SIZE)),
    counts,
    staff,
  };
}

async function queueCounts(viewer: Viewer, activeIds: string[], now: Date) {
  const queues = STAFF_QUEUES.filter(
    (queue) => queue !== 'ouvidoria' || hasStaffPermission(viewer.role, 'support.ombudsman'),
  );
  const totals = await Promise.all(
    queues.map(async (queue) => {
      const condition =
        queue === 'todos'
          ? and(queueCondition(queue, viewer, activeIds, now), ne(supportTickets.status, 'closed'))
          : queueCondition(queue, viewer, activeIds, now);
      const [row] = await db.select({ total: count() }).from(supportTickets).where(condition);
      return [queue, row?.total ?? 0] as const;
    }),
  );
  return Object.fromEntries(totals) as Partial<Record<StaffQueue, number>>;
}

/** Chamados esperando o suporte que esta pessoa pode ver (o número do menu). */
export async function countWaitingTickets(viewer: Viewer): Promise<number> {
  const queues: ('general' | 'ombudsman')[] = hasStaffPermission(viewer.role, 'support.ombudsman')
    ? ['general', 'ombudsman']
    : ['general'];
  const [row] = await db
    .select({ total: count() })
    .from(supportTickets)
    .where(and(eq(supportTickets.status, 'open'), inArray(supportTickets.queue, queues)));
  return row?.total ?? 0;
}

export type StaffTicketDetail = NonNullable<Awaited<ReturnType<typeof getStaffTicket>>>;

export async function getStaffTicket(number: number, viewer: Viewer) {
  if (!Number.isInteger(number) || number < 1) return null;
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.number, number)).limit(1);
  if (!ticket || !canSeeQueue(ticket.queue, viewer.role)) return null;
  const [messages, attachments, events, reads, staff, templates, requester] = await Promise.all([
    db
      .select()
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticket.id))
      .orderBy(asc(supportTicketMessages.createdAt)),
    db
      .select()
      .from(supportTicketAttachments)
      .where(eq(supportTicketAttachments.ticketId, ticket.id))
      .orderBy(asc(supportTicketAttachments.createdAt)),
    db
      .select()
      .from(supportTicketEvents)
      .where(eq(supportTicketEvents.ticketId, ticket.id))
      .orderBy(asc(supportTicketEvents.id)),
    db.select().from(supportTicketReads).where(eq(supportTicketReads.ticketId, ticket.id)),
    loadStaffDirectory(),
    db
      .select()
      .from(supportReplyTemplates)
      .where(eq(supportReplyTemplates.active, true))
      .orderBy(asc(supportReplyTemplates.position)),
    ticket.requesterId ? loadRequesterProfile(ticket.requesterId, ticket.id, viewer) : Promise.resolve(null),
  ]);
  return { ticket, messages, attachments, events, reads, staff, templates, requester };
}

async function loadRequesterProfile(userId: string, currentTicketId: string, viewer: Viewer) {
  const [account] = await db
    .select({
      id: user.id,
      name: user.name,
      preferredName: user.preferredName,
      email: user.email,
      image: user.image,
      banned: user.banned,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!account) return null;
  const [products, validity, store, lastLesson, presence, otherTickets] = await Promise.all([
    db.select({ product: studentProducts.product }).from(studentProducts).where(eq(studentProducts.userId, userId)),
    getAccessValidity(userId),
    db.select({ phase: stores.phase }).from(stores).where(eq(stores.userId, userId)).limit(1),
    db
      .select({ title: learningLessons.title, viewedAt: learningLessonProgress.lastViewedAt })
      .from(learningLessonProgress)
      .innerJoin(learningLessons, eq(learningLessons.id, learningLessonProgress.lessonId))
      .where(eq(learningLessonProgress.userId, userId))
      .orderBy(desc(learningLessonProgress.lastViewedAt))
      .limit(1),
    db.select({ lastSeenAt: userPresence.lastSeenAt }).from(userPresence).where(and(eq(userPresence.userId, userId), visiblePresenceCondition())).limit(1),
    db
      .select({
        number: supportTickets.number,
        subject: supportTickets.subject,
        status: supportTickets.status,
        updatedAt: supportTickets.updatedAt,
      })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.requesterId, userId),
        ne(supportTickets.id, currentTicketId),
        hasStaffPermission(viewer.role, 'support.ombudsman') ? undefined : eq(supportTickets.queue, 'general'),
      ))
      .orderBy(desc(supportTickets.updatedAt))
      .limit(5),
  ]);
  const lastSeenAt = presence[0]?.lastSeenAt ?? null;
  return {
    ...account,
    displayName: account.preferredName?.trim() || account.name,
    products: products.map((row) => row.product),
    validity,
    storePhase: store[0]?.phase ?? null,
    lastLesson: lastLesson[0] ?? null,
    lastSeenAt,
    online: lastSeenAt ? Date.now() - lastSeenAt.getTime() < ONLINE_WINDOW_MS : false,
    otherTickets,
  };
}

export async function listReplyTemplates() {
  return db.select().from(supportReplyTemplates).orderBy(asc(supportReplyTemplates.position));
}

export type { StaffMember };

/** O cartão "Suporte agora" do Painel: a fila e a equipe neste momento. */
export async function loadSupportNow(now = new Date()) {
  const staff = await loadStaffDirectory();
  const answer = staff.filter((member) => hasStaffPermission(member.role, 'support.answer'));
  const activeIds = answer.map((member) => member.id);
  const [[waiting], [late], [unassigned]] = await Promise.all([
    db.select({ total: count() }).from(supportTickets).where(eq(supportTickets.status, 'open')),
    db.select({ total: count() }).from(supportTickets).where(and(eq(supportTickets.status, 'open'), lt(supportTickets.dueAt, now))),
    db
      .select({ total: count() })
      .from(supportTickets)
      .where(
        and(
          ne(supportTickets.status, 'closed'),
          eq(supportTickets.queue, 'general'),
          activeIds.length ? or(isNull(supportTickets.assigneeId), notInArray(supportTickets.assigneeId, activeIds)) : undefined,
        ),
      ),
  ]);
  return {
    waiting: waiting?.total ?? 0,
    late: late?.total ?? 0,
    unassigned: unassigned?.total ?? 0,
    available: answer.filter((member) => member.available).map((member) => member.name),
  };
}

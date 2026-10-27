import { createHash, randomBytes } from 'node:crypto';
import { and, asc, count, eq, ilike, inArray, isNull, max, ne, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  supportAccessTokens,
  supportStaffStatus,
  supportTicketAttachments,
  supportTicketEvents,
  supportTicketMessages,
  supportTicketReads,
  supportTickets,
  user,
} from '@/server/db/schema';
import type { PlannedTicket } from '../plan-ticket';
import { addSupportMinutes, type SupportSchedule } from '../support-hours';
import { hasStaffPermission, isStaffRole } from '../staff-access';
import {
  afterRequesterMessage,
  afterStaffReply,
  canAssign,
  closesAutomatically,
  rates,
  requesterCloses,
  staffChangesStatus,
  type RuleResult,
  type TicketEventDraft,
  type TicketPatch,
  type TicketPriority,
  type TicketState,
  type TicketStatus,
} from '../ticket-rules';
import { deadlineMinutesFor, loadSupportSchedule, type SupportSettings } from './settings';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type TicketRow = typeof supportTickets.$inferSelect;

export const PUBLIC_LINK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export class TicketActionError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 409,
  ) {
    super(message);
    this.name = 'TicketActionError';
  }
}

export type StoredAttachment = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  image: string | null;
  available: boolean;
};

/** A equipe ativa (não bloqueada), com a disponibilidade de cada pessoa. */
export async function loadStaffDirectory(): Promise<StaffMember[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      preferredName: user.preferredName,
      email: user.email,
      role: user.role,
      image: user.image,
      available: supportStaffStatus.available,
    })
    .from(user)
    .leftJoin(supportStaffStatus, eq(supportStaffStatus.userId, user.id))
    .where(
      and(
        or(isNull(user.banned), eq(user.banned, false)),
        // O banco descarta as alunas; o cargo exato é conferido abaixo (várias funções por conta).
        or(ilike(user.role, '%support_%'), ilike(user.role, '%admin%')),
      ),
    )
    .orderBy(asc(user.name));
  return rows
    .filter((row) => isStaffRole(row.role))
    .map((row) => ({
      id: row.id,
      name: row.preferredName?.trim() || row.name,
      email: row.email,
      role: row.role,
      image: row.image,
      available: row.available ?? true,
    }));
}

export function isActiveAssignee(staff: readonly StaffMember[], id: string | null): boolean {
  if (!id) return false;
  return staff.some((member) => member.id === id && hasStaffPermission(member.role, 'support.answer'));
}

function stateOf(row: TicketRow): TicketState {
  return {
    status: row.status,
    assigneeId: row.assigneeId,
    awaitingSince: row.awaitingSince,
    firstResponseAt: row.firstResponseAt,
    closedAt: row.closedAt,
    closedReason: row.closedReason,
    rating: row.rating,
  };
}

/** O prazo do relógio atual, em horas de atendimento. Sem relógio ligado, sem prazo. */
export function dueAtFor(
  awaitingSince: Date | null,
  priority: TicketPriority,
  settings: SupportSettings,
  schedule: SupportSchedule,
): Date | null {
  if (!awaitingSince) return null;
  return addSupportMinutes(awaitingSince, deadlineMinutesFor(settings, priority), schedule);
}

async function lockTicket(tx: Transaction, id: string): Promise<TicketRow> {
  const [row] = await tx.select().from(supportTickets).where(eq(supportTickets.id, id)).for('update').limit(1);
  if (!row) throw new TicketActionError('Chamado não encontrado.', 404);
  return row;
}

async function applyRule(
  tx: Transaction,
  row: TicketRow,
  result: RuleResult,
  options: { actorId: string | null; automatic?: boolean; extraPatch?: Partial<TicketRow> },
): Promise<TicketRow> {
  if (!result.ok) throw new TicketActionError(result.message, result.status);
  const { settings, schedule } = await loadSupportSchedule();
  return writeTicket(tx, row, result.patch, result.events, { ...options, settings, schedule });
}

async function writeTicket(
  tx: Transaction,
  row: TicketRow,
  patch: TicketPatch,
  events: TicketEventDraft[],
  options: {
    actorId: string | null;
    automatic?: boolean;
    extraPatch?: Partial<TicketRow>;
    settings: SupportSettings;
    schedule: SupportSchedule;
  },
): Promise<TicketRow> {
  const merged = { ...row, ...patch, ...options.extraPatch };
  const clockChanged =
    merged.awaitingSince?.getTime() !== row.awaitingSince?.getTime() || merged.priority !== row.priority;
  const dueAt = clockChanged
    ? dueAtFor(merged.awaitingSince, merged.priority, options.settings, options.schedule)
    : row.dueAt;
  const [updated] = await tx
    .update(supportTickets)
    .set({
      ...patch,
      ...options.extraPatch,
      dueAt,
      ...(clockChanged ? { lateNotifiedAt: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, row.id))
    .returning();
  if (events.length)
    await tx.insert(supportTicketEvents).values(
      events.map((event) => ({
        ticketId: row.id,
        actorId: options.automatic ? null : options.actorId,
        automatic: options.automatic ?? false,
        type: event.type,
        fromValue: event.from,
        toValue: event.to,
      })),
    );
  if (!updated) throw new TicketActionError('Chamado não encontrado.', 404);
  return updated;
}

async function insertMessage(
  tx: Transaction,
  ticketId: string,
  author: { id: string | null; name: string },
  body: string,
  flags: { fromStaff: boolean; internal: boolean },
  attachments: readonly StoredAttachment[],
) {
  const [message] = await tx
    .insert(supportTicketMessages)
    .values({ ticketId, authorId: author.id, authorName: author.name, body, ...flags })
    .returning({ id: supportTicketMessages.id, createdAt: supportTicketMessages.createdAt });
  if (!message) throw new TicketActionError('Não foi possível gravar a mensagem.');
  if (attachments.length)
    await tx
      .insert(supportTicketAttachments)
      .values(attachments.map((file) => ({ ...file, ticketId, messageId: message.id })));
  return message;
}

export type NewTicketInput = {
  planned: PlannedTicket;
  requester: { id: string | null; email: string; name: string };
  channel: 'platform' | 'public_form';
  context: {
    product: 'loja-pronta' | 'sll' | null;
    lessonId: string | null;
    storePhase: number | null;
    errorDigest: string | null;
    pagePath: string | null;
  };
  assistantAnswerId: string | null;
  defaultAssigneeId: string | null;
  attachments: readonly StoredAttachment[];
  submissionId: string | null;
};

/** Quem recebe um chamado novo: a responsável do tema, a distribuição automática ou a fila. */
async function pickAssignee(
  tx: Transaction,
  input: NewTicketInput,
  settings: SupportSettings,
  staff: readonly StaffMember[],
): Promise<string | null> {
  const permission = input.planned.queue === 'ombudsman' ? 'support.ombudsman' : 'support.answer';
  const eligible = staff.filter((member) => member.available && hasStaffPermission(member.role, permission));
  const preferred = eligible.find((member) => member.id === input.defaultAssigneeId);
  if (preferred) return preferred.id;
  if (!settings.autoAssign || eligible.length === 0) return null;
  const loads = await tx
    .select({ assigneeId: supportTickets.assigneeId, total: count() })
    .from(supportTickets)
    .where(
      and(
        inArray(
          supportTickets.assigneeId,
          eligible.map((member) => member.id),
        ),
        ne(supportTickets.status, 'closed'),
      ),
    )
    .groupBy(supportTickets.assigneeId);
  const loadOf = (id: string) => loads.find((row) => row.assigneeId === id)?.total ?? 0;
  const candidates = eligible
    .filter((member) => loadOf(member.id) < settings.maxOpenPerPerson)
    .toSorted((a, b) => loadOf(a.id) - loadOf(b.id));
  return candidates[0]?.id ?? null;
}

export async function createTicket(input: NewTicketInput): Promise<TicketRow> {
  const [{ settings, schedule }, staff] = await Promise.all([loadSupportSchedule(), loadStaffDirectory()]);
  const now = new Date();
  return db.transaction(async (tx) => {
    const assigneeId = await pickAssignee(tx, input, settings, staff);
    const [ticket] = await tx
      .insert(supportTickets)
      .values({
        requesterId: input.requester.id,
        requesterEmail: input.requester.email,
        requesterName: input.requester.name,
        subject: input.planned.subject,
        status: 'open',
        queue: input.planned.queue,
        topicId: input.planned.topicId,
        situationId: input.planned.situationId,
        priority: input.planned.priority,
        assigneeId,
        awaitingSince: now,
        dueAt: dueAtFor(now, input.planned.priority, settings, schedule),
        channel: input.channel,
        emailConfirmedAt: input.channel === 'platform' ? now : null,
        assistantAnswerId: input.assistantAnswerId,
        submissionId: input.submissionId,
        ...input.context,
      })
      .returning();
    if (!ticket) throw new TicketActionError('Não foi possível abrir o chamado.');
    const message = await insertMessage(
      tx,
      ticket.id,
      { id: input.requester.id, name: input.requester.name },
      input.planned.description,
      { fromStaff: false, internal: false },
      input.attachments,
    );
    if (assigneeId)
      await tx
        .insert(supportTicketEvents)
        .values({ ticketId: ticket.id, automatic: true, type: 'assigned', toValue: assigneeId });
    if (input.requester.id)
      // O horário da própria mensagem (relógio do banco): com o do servidor, uma diferença de
      // relógio entre as máquinas escondia a primeira resposta da equipe.
      await markReadInTransaction(tx, ticket.id, input.requester.id, message.createdAt);
    return ticket;
  });
}

export async function appendRequesterMessage(
  ticketId: string,
  author: { id: string | null; name: string },
  body: string,
  attachments: readonly StoredAttachment[],
): Promise<TicketRow> {
  const now = new Date();
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    const message = await insertMessage(
      tx,
      ticketId,
      author,
      body,
      { fromStaff: false, internal: false },
      attachments,
    );
    const updated = await applyRule(tx, row, afterRequesterMessage(stateOf(row), now), { actorId: author.id });
    if (author.id) await markReadInTransaction(tx, ticketId, author.id, message.createdAt);
    return updated;
  });
}

export type StaffActor = { id: string; name: string; role: string | null | undefined };

export async function appendStaffMessage(
  ticketId: string,
  actor: StaffActor,
  input: { body: string; internal: boolean; statusAfter: TicketStatus },
  attachments: readonly StoredAttachment[],
): Promise<{ ticket: TicketRow; previous: TicketRow }> {
  const staff = await loadStaffDirectory();
  const now = new Date();
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    assertQueueAccess(row, actor.role);
    if (input.internal) {
      const message = await insertMessage(
        tx,
        ticketId,
        actor,
        input.body,
        { fromStaff: true, internal: true },
        attachments,
      );
      await markReadInTransaction(tx, ticketId, actor.id, message.createdAt);
      const [touched] = await tx
        .update(supportTickets)
        .set({ updatedAt: now })
        .where(eq(supportTickets.id, ticketId))
        .returning();
      return { ticket: touched ?? row, previous: row };
    }
    const result = afterStaffReply(stateOf(row), {
      actorId: actor.id,
      assigneeActive: isActiveAssignee(staff, row.assigneeId),
      statusAfter: input.statusAfter,
      now,
    });
    if (!result.ok) throw new TicketActionError(result.message, result.status);
    const message = await insertMessage(
      tx,
      ticketId,
      actor,
      input.body,
      { fromStaff: true, internal: false },
      attachments,
    );
    const ticket = await applyRule(tx, row, result, { actorId: actor.id });
    await markReadInTransaction(tx, ticketId, actor.id, message.createdAt);
    return { ticket, previous: row };
  });
}

export function canSeeQueue(queue: TicketRow['queue'], role: string | null | undefined): boolean {
  if (queue === 'ombudsman') return hasStaffPermission(role, 'support.ombudsman');
  return hasStaffPermission(role, 'support.answer');
}

function assertQueueAccess(row: TicketRow, role: string | null | undefined) {
  if (!canSeeQueue(row.queue, role)) throw new TicketActionError('Chamado não encontrado.', 404);
}

export async function changeStatusByStaff(ticketId: string, actor: StaffActor, next: TicketStatus) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    assertQueueAccess(row, actor.role);
    return applyRule(tx, row, staffChangesStatus(stateOf(row), next, now), { actorId: actor.id });
  });
}

export async function assignTicket(ticketId: string, actor: StaffActor, targetId: string | null) {
  const staff = await loadStaffDirectory();
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    assertQueueAccess(row, actor.role);
    const permission = row.queue === 'ombudsman' ? 'support.ombudsman' : 'support.answer';
    if (targetId && !staff.some((member) => member.id === targetId && hasStaffPermission(member.role, permission)))
      throw new TicketActionError('Escolha alguém da equipe de suporte.', 400);
    const activeAssigneeId = isActiveAssignee(staff, row.assigneeId) ? row.assigneeId : null;
    const decision = canAssign({
      actorId: actor.id,
      canAssignOthers: hasStaffPermission(actor.role, 'support.assign_others'),
      activeAssigneeId,
      targetId,
    });
    if (!decision.ok) throw new TicketActionError(decision.message, 403);
    if (row.assigneeId === targetId) return row;
    const { settings, schedule } = await loadSupportSchedule();
    return writeTicket(
      tx,
      row,
      { assigneeId: targetId },
      [{ type: 'assigned', from: row.assigneeId, to: targetId }],
      { actorId: actor.id, settings, schedule },
    );
  });
}

export async function changePriority(ticketId: string, actor: StaffActor, priority: TicketPriority) {
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    assertQueueAccess(row, actor.role);
    if (row.priority === priority) return row;
    const { settings, schedule } = await loadSupportSchedule();
    return writeTicket(
      tx,
      row,
      {},
      [{ type: 'priority_changed', from: row.priority, to: priority }],
      { actorId: actor.id, extraPatch: { priority }, settings, schedule },
    );
  });
}

export async function changeTopic(
  ticketId: string,
  actor: StaffActor,
  topicId: string,
  situationId: string | null,
) {
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    assertQueueAccess(row, actor.role);
    if (row.topicId === topicId && row.situationId === situationId) return row;
    const { settings, schedule } = await loadSupportSchedule();
    const events: TicketEventDraft[] =
      row.topicId === topicId ? [] : [{ type: 'topic_changed', from: row.topicId, to: topicId }];
    return writeTicket(tx, row, {}, events, {
      actorId: actor.id,
      extraPatch: { topicId, situationId },
      settings,
      schedule,
    });
  });
}

export async function changeQueue(ticketId: string, actor: StaffActor, queue: TicketRow['queue']) {
  if (!hasStaffPermission(actor.role, 'support.ombudsman'))
    throw new TicketActionError('Só supervisores mexem na Ouvidoria.', 403);
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    if (row.queue === queue) return row;
    const { settings, schedule } = await loadSupportSchedule();
    return writeTicket(tx, row, {}, [{ type: 'queue_changed', from: row.queue, to: queue }], {
      actorId: actor.id,
      extraPatch: { queue },
      settings,
      schedule,
    });
  });
}

export async function closeByRequester(ticketId: string, requesterId: string | null) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    return applyRule(tx, row, requesterCloses(stateOf(row), now), { actorId: requesterId });
  });
}

/** "Ainda não resolveu": responde na hora e devolve o chamado pra fila do suporte. */
export async function reopenNotResolved(ticketId: string, author: { id: string | null; name: string }) {
  return appendRequesterMessage(ticketId, author, 'Ainda não resolveu.', []);
}

export async function rateTicket(ticketId: string, requesterId: string | null, rating: number, comment: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    return applyRule(tx, row, rates(stateOf(row), rating, comment.slice(0, 1000), now), {
      actorId: requesterId,
    });
  });
}

/** Encerramento automático por falta de retorno (worker): evento sem autor, `automatic`. */
/** A última resposta pública da equipe no chamado (nota interna não conta). */
export function lastPublicStaffReplyAt() {
  // Com o nome da tabela: sem ele, dentro da subconsulta `"id"` seria o id da mensagem.
  const ticketId = sql`${sql.identifier('support_tickets')}.${sql.identifier('id')}`;
  return sql<Date | null>`(
    select max(m.created_at) from ${supportTicketMessages} m
    where m.ticket_id = ${ticketId} and m.from_staff = true and m.internal = false
  )`;
}

/** Encerra um respondido parado. Confere de novo com a linha travada: alguém pode ter respondido. */
export async function closeIdleTicket(ticketId: string, cutoff: Date) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    if (row.status !== 'answered' || row.awaitingSince) return null;
    const [last] = await tx
      .select({ at: max(supportTicketMessages.createdAt) })
      .from(supportTicketMessages)
      .where(
        and(
          eq(supportTicketMessages.ticketId, ticketId),
          eq(supportTicketMessages.fromStaff, true),
          eq(supportTicketMessages.internal, false),
        ),
      );
    if (!last?.at || last.at.getTime() >= cutoff.getTime()) return null;
    return applyRule(tx, row, closesAutomatically(stateOf(row), now), { actorId: null, automatic: true });
  });
}

/** Desfaz o "Sim, resolveu" nos 5 segundos: reabre como estava (respondido). */
export async function undoRequesterClose(ticketId: string, requesterId: string | null) {
  return db.transaction(async (tx) => {
    const row = await lockTicket(tx, ticketId);
    if (row.status !== 'closed' || row.closedReason !== 'requester' || row.rating !== null)
      throw new TicketActionError('Este chamado não pode mais ser reaberto assim.');
    const closedFor = Date.now() - (row.closedAt?.getTime() ?? 0);
    if (closedFor > 30_000) throw new TicketActionError('O tempo pra desfazer acabou. Responda pra reabrir.');
    const { settings, schedule } = await loadSupportSchedule();
    return writeTicket(
      tx,
      row,
      { status: 'answered', closedAt: null, closedReason: null },
      [{ type: 'status_changed', from: 'closed', to: 'answered' }],
      { actorId: requesterId, settings, schedule },
    );
  });
}

async function markReadInTransaction(tx: Transaction, ticketId: string, userId: string, at: Date) {
  await tx
    .insert(supportTicketReads)
    .values({ ticketId, userId, readAt: at })
    .onConflictDoUpdate({
      target: [supportTicketReads.ticketId, supportTicketReads.userId],
      set: { readAt: sql`greatest(${supportTicketReads.readAt}, excluded.read_at)` },
    });
}

/** Marca como lido até a mensagem que apareceu na tela (nunca volta no tempo). */
export async function markTicketRead(ticketId: string, userId: string, messageId: string) {
  const [message] = await db
    .select({ createdAt: supportTicketMessages.createdAt })
    .from(supportTicketMessages)
    .where(and(eq(supportTicketMessages.id, messageId), eq(supportTicketMessages.ticketId, ticketId)))
    .limit(1);
  if (!message) return;
  await db.transaction((tx) => markReadInTransaction(tx, ticketId, userId, message.createdAt));
}

/** Link mágico do chamado aberto sem login: o token puro vai só no e-mail. */
export async function issuePublicLink(ticketId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.insert(supportAccessTokens).values({
    tokenHash: hashToken(token),
    ticketId,
    expiresAt: new Date(Date.now() + PUBLIC_LINK_DAYS * DAY_MS),
  });
  return token;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** O chamado do link mágico, se o link vale. Abrir confirma o e-mail do chamado. */
export async function ticketFromPublicToken(token: string): Promise<TicketRow | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [found] = await db
    .select({ ticket: supportTickets, expiresAt: supportAccessTokens.expiresAt })
    .from(supportAccessTokens)
    .innerJoin(supportTickets, eq(supportTickets.id, supportAccessTokens.ticketId))
    .where(eq(supportAccessTokens.tokenHash, hashToken(token)))
    .limit(1);
  if (!found || found.expiresAt.getTime() < Date.now()) return null;
  if (found.ticket.emailConfirmedAt) return found.ticket;
  const now = new Date();
  await db.update(supportAccessTokens).set({ usedAt: now }).where(eq(supportAccessTokens.tokenHash, hashToken(token)));
  const [confirmed] = await db
    .update(supportTickets)
    .set({ emailConfirmedAt: now })
    .where(and(eq(supportTickets.id, found.ticket.id), isNull(supportTickets.emailConfirmedAt)))
    .returning();
  return confirmed ?? found.ticket;
}

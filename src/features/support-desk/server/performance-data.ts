import { and, count, eq, gte, inArray, isNull, ne, notInArray, or } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  supportFaqAnswers,
  supportFaqFeedback,
  supportTicketEvents,
  supportTicketMessages,
  supportTickets,
  supportWhatsappClicks,
  user,
} from '@/server/db/schema';
import { hasStaffPermission } from '@/features/support/staff-access';
import { loadSupportSchedule } from '@/features/support/server/settings';
import { loadStaffDirectory } from '@/features/support/server/tickets';
import type { PerfEvent, PerfInput, PerfTicket } from '../performance';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Linhas cruas do período e do anterior: as regras puras (`performance.ts`) montam o relatório.
 * O volume é baixo (centenas por mês); se crescer, a agregação vai pro SQL.
 */
export async function loadPerformance(days: 7 | 30 | 90, now = new Date()) {
  const to = now;
  const from = new Date(to.getTime() - days * DAY_MS);
  const previousFrom = new Date(from.getTime() - days * DAY_MS);
  const since = new Date(previousFrom.getTime() - 30 * DAY_MS);
  const [{ settings, schedule }, staffDirectory] = await Promise.all([loadSupportSchedule(), loadStaffDirectory()]);
  const events = await db
    .select({
      ticketId: supportTicketEvents.ticketId,
      type: supportTicketEvents.type,
      fromValue: supportTicketEvents.fromValue,
      toValue: supportTicketEvents.toValue,
      createdAt: supportTicketEvents.createdAt,
    })
    .from(supportTicketEvents)
    .where(and(gte(supportTicketEvents.createdAt, since), inArray(supportTicketEvents.type, ['status_changed', 'rated'])));
  const eventTicketIds = [...new Set(events.map((event) => event.ticketId))];
  const tickets = await db
    .select({
      id: supportTickets.id,
      requesterId: supportTickets.requesterId,
      topicId: supportTickets.topicId,
      situationId: supportTickets.situationId,
      priority: supportTickets.priority,
      queue: supportTickets.queue,
      createdAt: supportTickets.createdAt,
      firstResponseAt: supportTickets.firstResponseAt,
      lessonId: supportTickets.lessonId,
      storePhase: supportTickets.storePhase,
      status: supportTickets.status,
      assigneeId: supportTickets.assigneeId,
      dueAt: supportTickets.dueAt,
    })
    .from(supportTickets)
    .where(
      or(
        gte(supportTickets.createdAt, since),
        eventTicketIds.length ? inArray(supportTickets.id, eventTicketIds) : undefined,
        ne(supportTickets.status, 'closed'),
      ),
    );
  const ticketIds = tickets.map((ticket) => ticket.id);
  const staffMessages = ticketIds.length
    ? await db
        .select({ ticketId: supportTicketMessages.ticketId, authorId: supportTicketMessages.authorId, createdAt: supportTicketMessages.createdAt })
        .from(supportTicketMessages)
        .where(
          and(
            inArray(supportTicketMessages.ticketId, ticketIds),
            eq(supportTicketMessages.fromStaff, true),
            eq(supportTicketMessages.internal, false),
          ),
        )
    : [];
  // Equipe medida: atendentes e supervisores; administradores só se responderam no período.
  const responders = new Set(staffMessages.filter((message) => message.createdAt >= from).map((message) => message.authorId));
  const measured = staffDirectory.filter(
    (member) => hasStaffPermission(member.role, 'support.answer') && (!member.role?.includes('admin') || responders.has(member.id)),
  );
  const joined = measured.length
    ? await db.select({ id: user.id, createdAt: user.createdAt }).from(user).where(inArray(user.id, measured.map((member) => member.id)))
    : [];
  const staff = measured.map((member) => ({
    id: member.id,
    name: member.name,
    joinedAt: joined.find((row) => row.id === member.id)?.createdAt ?? now,
  }));
  const activeIds = staffDirectory.filter((member) => hasStaffPermission(member.role, 'support.answer')).map((member) => member.id);
  const [unassigned] = await db
    .select({ total: count() })
    .from(supportTickets)
    .where(
      and(
        ne(supportTickets.status, 'closed'),
        eq(supportTickets.queue, 'general'),
        activeIds.length ? or(isNull(supportTickets.assigneeId), notInArray(supportTickets.assigneeId, activeIds)) : undefined,
      ),
    );
  const [faq, clicks] = await Promise.all([
    db
      .select({ answerId: supportFaqFeedback.answerId, resolved: supportFaqFeedback.resolved, title: supportFaqAnswers.title, total: count() })
      .from(supportFaqFeedback)
      .innerJoin(supportFaqAnswers, eq(supportFaqAnswers.id, supportFaqFeedback.answerId))
      .where(gte(supportFaqFeedback.createdAt, from))
      .groupBy(supportFaqFeedback.answerId, supportFaqFeedback.resolved, supportFaqAnswers.title),
    db
      .select({ topic: supportWhatsappClicks.topic, source: supportWhatsappClicks.source, total: count() })
      .from(supportWhatsappClicks)
      .where(gte(supportWhatsappClicks.createdAt, from))
      .groupBy(supportWhatsappClicks.topic, supportWhatsappClicks.source),
  ]);
  const base = {
    tickets: tickets as PerfTicket[],
    events: events as PerfEvent[],
    staffMessages,
    staff,
    schedule,
    deadlineMinutes: settings.deadlineMinutes,
    now,
  };
  const current: PerfInput = { ...base, from, to };
  const previous: PerfInput = { ...base, from: previousFrom, to: from };
  const faqByAnswer = new Map<string, { title: string; resolved: number; notResolved: number }>();
  for (const row of faq) {
    const entry = faqByAnswer.get(row.answerId) ?? { title: row.title, resolved: 0, notResolved: 0 };
    if (row.resolved) entry.resolved += row.total;
    else entry.notResolved += row.total;
    faqByAnswer.set(row.answerId, entry);
  }
  return {
    current,
    previous,
    unassigned: unassigned?.total ?? 0,
    faq: [...faqByAnswer.values()].map((entry) => ({
      title: entry.title,
      resolved: entry.resolved,
      total: entry.resolved + entry.notResolved,
      ratio: entry.resolved + entry.notResolved ? entry.notResolved / (entry.resolved + entry.notResolved) : 0,
    })),
    clicks,
  };
}

import { SUPPORT_EMAIL_ENABLED } from '../email-policy';
import { and, avg, count, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  supportAccessTokens,
  supportTicketAttachments,
  supportTicketEvents,
  supportTicketMessages,
  supportTickets,
} from '@/server/db/schema';
import { storage } from '@/server/storage';
import { absoluteUrl, sendEmailInBackground } from '@/server/email/send';
import { brasiliaDate, brasiliaHour } from '../support-hours';
import { hasStaffPermission } from '../staff-access';
import { ticketCode } from '../copy';
import { autoCloseCutoff } from '../ticket-rules';
import { dailySummaryEmail, deadlineMissedEmail } from '../email-messages';
import { loadSupportSettings } from './settings';
import { closeIdleTicket, lastPublicStaffReplyAt, loadStaffDirectory } from './tickets';

/**
 * As tarefas do suporte no worker que já existe (sem cron nem BullMQ). Cada tarefa tem um ritmo e
 * uma trava no banco (`rate_limits`): com dois processos, só um faz o trabalho daquela janela.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH = 500;

/** Pega a vez daquela tarefa naquela janela (hora, dia...). Falso: outro processo já fez. */
async function claimWindow(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await db.execute<{ key: string }>(sql`
    insert into rate_limits (key, points, expire)
    values (${`support-job:${key}`}, 1, now() + make_interval(secs => ${ttlSeconds}))
    on conflict (key) do nothing
    returning key
  `);
  return result.rows.length > 0;
}

/**
 * Respondidos sem retorno da aluna há N dias de calendário: encerra, em lotes. Conta a partir da
 * última resposta pública da equipe (não do `updated_at`): uma nota interna ou uma troca de
 * prioridade não adia o encerramento, e a data bate com a que a aluna vê.
 */
export async function closeIdleTickets(now = new Date()): Promise<number> {
  const settings = await loadSupportSettings();
  const cutoff = autoCloseCutoff(now, settings.autoCloseDays);
  const idle = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.status, 'answered'),
        isNull(supportTickets.awaitingSince),
        lt(lastPublicStaffReplyAt(), cutoff),
      ),
    )
    .limit(BATCH);
  let closed = 0;
  for (const ticket of idle) {
    if (await closeIdleTicket(ticket.id, cutoff).catch(() => null)) closed += 1;
  }
  return closed;
}

/** Prazo perdido: um evento e um e-mail pra responsável e pros supervisores, uma vez por atraso. */
export async function flagMissedDeadlines(now = new Date()): Promise<number> {
  const late = await db
    .update(supportTickets)
    .set({ lateNotifiedAt: now })
    .where(and(eq(supportTickets.status, 'open'), isNotNull(supportTickets.dueAt), lt(supportTickets.dueAt, now), isNull(supportTickets.lateNotifiedAt)))
    .returning();
  if (late.length === 0) return 0;
  await db
    .insert(supportTicketEvents)
    .values(late.map((ticket) => ({ ticketId: ticket.id, automatic: true, type: 'deadline_missed' as const })));
  if (!SUPPORT_EMAIL_ENABLED) return late.length;
  const staff = await loadStaffDirectory();
  const supervisors = staff.filter((member) => hasStaffPermission(member.role, 'support.assign_others') && !member.role?.includes('admin'));
  for (const ticket of late) {
    const message = deadlineMissedEmail(ticketCode(ticket.number), ticket.subject, absoluteUrl(`/admin/chamados/${ticket.number}`));
    const assignee = staff.find((member) => member.id === ticket.assigneeId);
    const recipients = [...(assignee ? [assignee] : []), ...supervisors.filter((member) => member.id !== assignee?.id)];
    for (const member of recipients)
      sendEmailInBackground({ to: member.email, ...message, idempotencyKey: `ticket:${ticket.id}:late:${ticket.dueAt?.toISOString()}:${member.id}` }, 'support');
  }
  return late.length;
}

/** Resumo das 8h (Brasília) pros supervisores: aguardando, atrasados, sem responsável, nota de ontem. */
export async function sendDailySummary(now = new Date()): Promise<boolean> {
  if (!SUPPORT_EMAIL_ENABLED) return false;
  if (brasiliaHour(now) !== 8) return false;
  if (!(await claimWindow(`daily-summary:${brasiliaDate(now)}`, 2 * DAY_MS / 1000))) return false;
  const staff = await loadStaffDirectory();
  const answerIds = staff.filter((member) => hasStaffPermission(member.role, 'support.answer')).map((member) => member.id);
  const yesterday = new Date(now.getTime() - DAY_MS);
  const [[waiting], [late], [unassigned], [rating]] = await Promise.all([
    db.select({ total: count() }).from(supportTickets).where(eq(supportTickets.status, 'open')),
    db.select({ total: count() }).from(supportTickets).where(and(eq(supportTickets.status, 'open'), lt(supportTickets.dueAt, now))),
    db
      .select({ total: count() })
      .from(supportTickets)
      .where(
        and(
          ne(supportTickets.status, 'closed'),
          answerIds.length
            ? sql`(${supportTickets.assigneeId} is null or ${supportTickets.assigneeId} not in ${answerIds})`
            : undefined,
        ),
      ),
    db.select({ average: avg(supportTickets.rating) }).from(supportTickets).where(and(gte(supportTickets.ratedAt, yesterday), lte(supportTickets.ratedAt, now))),
  ]);
  const message = dailySummaryEmail({
    waiting: waiting?.total ?? 0,
    late: late?.total ?? 0,
    unassigned: unassigned?.total ?? 0,
    averageRating: rating?.average ? Number(rating.average) : null,
    url: absoluteUrl('/admin/chamados'),
  });
  for (const member of staff.filter((item) => hasStaffPermission(item.role, 'support.metrics')))
    sendEmailInBackground({ to: member.email, ...message, idempotencyKey: `support:daily:${brasiliaDate(now)}:${member.id}` }, 'support');
  return true;
}

/** Guarda de dados: apaga anexos e anonimiza chamados antigos; expira links mágicos. */
export async function applyRetention(now = new Date()): Promise<void> {
  const settings = await loadSupportSettings();
  const attachmentLimit = new Date(now.getTime() - settings.attachmentRetentionDays * DAY_MS);
  const files = await db
    .select({ id: supportTicketAttachments.id, key: supportTicketAttachments.storageKey })
    .from(supportTicketAttachments)
    .innerJoin(supportTickets, eq(supportTickets.id, supportTicketAttachments.ticketId))
    .where(and(isNull(supportTicketAttachments.purgedAt), eq(supportTickets.status, 'closed'), lt(supportTickets.closedAt, attachmentLimit)))
    .limit(BATCH);
  for (const file of files) {
    try {
      await storage().remove(file.key);
    } catch {
      console.error('[support] attachment retention deletion failed; it will be retried.');
      continue;
    }
    await db.update(supportTicketAttachments).set({ purgedAt: now }).where(eq(supportTicketAttachments.id, file.id));
  }
  const ticketLimit = new Date(now.getTime() - settings.ticketRetentionYears * 365 * DAY_MS);
  const old = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(and(isNull(supportTickets.anonymizedAt), eq(supportTickets.status, 'closed'), lt(supportTickets.closedAt, ticketLimit)))
    .limit(BATCH);
  if (old.length) {
    const ids = old.map((ticket) => ticket.id);
    await db.transaction(async (tx) => {
      await tx
        .update(supportTicketMessages)
        .set({ body: '[Apagado pela política de guarda de dados]' })
        .where(inArray(supportTicketMessages.ticketId, ids));
      await tx
        .update(supportTicketMessages)
        .set({ authorName: 'Aluna' })
        .where(and(inArray(supportTicketMessages.ticketId, ids), eq(supportTicketMessages.fromStaff, false)));
      await tx
        .update(supportTickets)
        .set({ requesterName: 'Aluna', requesterEmail: '', requesterId: null, subject: '[Chamado antigo]', anonymizedAt: now })
        .where(inArray(supportTickets.id, ids));
    });
  }
  await db.delete(supportAccessTokens).where(lt(supportAccessTokens.expiresAt, new Date(now.getTime() - DAY_MS)));
}

/**
 * Uma volta do worker: prazos a cada 5 minutos, encerramento automático a cada hora, resumo às 8h
 * e guarda de dados uma vez por dia. Erro numa tarefa não derruba as outras.
 */
export async function runSupportMaintenance(now = new Date()): Promise<void> {
  const fiveMinutes = Math.floor(now.getTime() / (5 * 60 * 1000));
  const hour = Math.floor(now.getTime() / (60 * 60 * 1000));
  const tasks: [string, number, () => Promise<unknown>][] = [
    [`deadlines:${fiveMinutes}`, 10 * 60, () => flagMissedDeadlines(now)],
    [`auto-close:${hour}`, 2 * 60 * 60, () => closeIdleTickets(now)],
    [`retention:${brasiliaDate(now)}`, 2 * 24 * 60 * 60, () => applyRetention(now)],
  ];
  for (const [key, ttl, task] of tasks) {
    try {
      if (await claimWindow(key, ttl)) await task();
    } catch (error) {
      console.error(`[support] tarefa ${key.split(':')[0]} falhou: ${error instanceof Error ? error.name : 'erro'}`);
    }
  }
  await sendDailySummary(now).catch(() => console.error('[support] resumo diário falhou.'));
}

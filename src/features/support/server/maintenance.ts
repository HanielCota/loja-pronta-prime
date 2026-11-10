import { and, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  supportAccessTokens,
  supportTicketAttachments,
  supportTicketMessages,
  supportTickets,
} from '@/server/db/schema';
import { storage } from '@/server/storage';
import { brasiliaDate } from '../support-hours';
import { loadSupportSettings } from './settings';

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

/** Guarda de dados: apaga anexos e anonimiza chamados antigos; expira links mágicos. */
export async function applyRetention(now = new Date()): Promise<void> {
  const settings = await loadSupportSettings();
  const attachmentLimit = new Date(now.getTime() - settings.attachmentRetentionDays * DAY_MS);
  const files = await db
    .select({ id: supportTicketAttachments.id, key: supportTicketAttachments.storageKey })
    .from(supportTicketAttachments)
    .innerJoin(supportTickets, eq(supportTickets.id, supportTicketAttachments.ticketId))
    .where(
      and(
        isNull(supportTicketAttachments.purgedAt),
        eq(supportTickets.status, 'closed'),
        lt(supportTickets.closedAt, attachmentLimit),
      ),
    )
    .limit(BATCH);
  for (const file of files) {
    try {
      await storage().remove(file.key);
    } catch {
      console.error('[support] attachment retention deletion failed; it will be retried.');
      continue;
    }
    await db
      .update(supportTicketAttachments)
      .set({ purgedAt: now })
      .where(eq(supportTicketAttachments.id, file.id));
  }
  const ticketLimit = new Date(now.getTime() - settings.ticketRetentionYears * 365 * DAY_MS);
  const old = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(
      and(
        isNull(supportTickets.anonymizedAt),
        eq(supportTickets.status, 'closed'),
        lt(supportTickets.closedAt, ticketLimit),
      ),
    )
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
        .where(
          and(
            inArray(supportTicketMessages.ticketId, ids),
            eq(supportTicketMessages.fromStaff, false),
          ),
        );
      await tx
        .update(supportTickets)
        .set({
          requesterName: 'Aluna',
          requesterEmail: '',
          requesterId: null,
          subject: '[Chamado antigo]',
          anonymizedAt: now,
        })
        .where(inArray(supportTickets.id, ids));
    });
  }
  await db
    .delete(supportAccessTokens)
    .where(lt(supportAccessTokens.expiresAt, new Date(now.getTime() - DAY_MS)));
}

/** Only historical retention remains active after the ticket inbox is retired. */
export async function runSupportMaintenance(now = new Date()): Promise<void> {
  if (await claimWindow(`retention:${brasiliaDate(now)}`, 2 * 24 * 60 * 60)) {
    await applyRetention(now);
  }
}

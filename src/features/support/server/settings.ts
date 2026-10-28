import { asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  supportFaqAnswers,
  supportHolidays,
  supportReplyTemplates,
  supportSettings,
} from '@/server/db/schema';
import { DEFAULT_FAQ_ANSWERS } from '../faq';
import { DEFAULT_REPLY_TEMPLATES } from '../reply-templates';
import { DEFAULT_WEEKLY_HOURS, type SupportSchedule } from '../support-hours';
import type { TicketPriority } from '../ticket-rules';

const SETTINGS_ID = 'main';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Prazos de fábrica, em minutos de atendimento. */
export const DEFAULT_DEADLINE_MINUTES: Record<TicketPriority, number> = {
  urgent: 2 * 60,
  high: 4 * 60,
  normal: 8 * 60,
  low: 16 * 60,
};

/** Feriados nacionais de 2026 e 2027 (o admin edita em Configurações). */
const DEFAULT_HOLIDAYS = [
  ['2026-01-01', 'Confraternização Universal'],
  ['2026-04-03', 'Sexta-feira Santa'],
  ['2026-04-21', 'Tiradentes'],
  ['2026-05-01', 'Dia do Trabalho'],
  ['2026-09-07', 'Independência do Brasil'],
  ['2026-10-12', 'Nossa Senhora Aparecida'],
  ['2026-11-02', 'Finados'],
  ['2026-11-15', 'Proclamação da República'],
  ['2026-11-20', 'Dia da Consciência Negra'],
  ['2026-12-25', 'Natal'],
  ['2027-01-01', 'Confraternização Universal'],
  ['2027-03-26', 'Sexta-feira Santa'],
  ['2027-04-21', 'Tiradentes'],
  ['2027-05-01', 'Dia do Trabalho'],
  ['2027-09-07', 'Independência do Brasil'],
  ['2027-10-12', 'Nossa Senhora Aparecida'],
  ['2027-11-02', 'Finados'],
  ['2027-11-15', 'Proclamação da República'],
  ['2027-11-20', 'Dia da Consciência Negra'],
  ['2027-12-25', 'Natal'],
] as const;

export type SupportSettings = typeof supportSettings.$inferSelect;

/**
 * As configurações, criadas com os valores de fábrica na primeira leitura. Respostas prontas, FAQ
 * e feriados de fábrica entram junto, uma vez só: apagar um depois não faz ele voltar.
 */
export async function loadSupportSettings(tx?: Transaction): Promise<SupportSettings> {
  const [existing] = await (tx ?? db)
    .select()
    .from(supportSettings)
    .where(eq(supportSettings.id, SETTINGS_ID))
    .limit(1);
  if (existing?.seededAt) return existing;
  return tx ? seedSupportSettings(tx) : db.transaction(seedSupportSettings);
}

async function seedSupportSettings(tx: Transaction): Promise<SupportSettings> {
  await tx
    .insert(supportSettings)
    .values({
      id: SETTINGS_ID,
      weeklyHours: [...DEFAULT_WEEKLY_HOURS],
      deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
    })
    .onConflictDoNothing();
  const [row] = await tx
    .select()
    .from(supportSettings)
    .where(eq(supportSettings.id, SETTINGS_ID))
    .for('update')
    .limit(1);
  if (!row) throw new Error('Configurações do suporte indisponíveis.');
  if (row.seededAt) return row;
  await tx
    .insert(supportReplyTemplates)
    .values(DEFAULT_REPLY_TEMPLATES.map((template, position) => ({ ...template, position })));
  await tx
    .insert(supportFaqAnswers)
    .values(DEFAULT_FAQ_ANSWERS.map((answer) => ({ ...answer })))
    .onConflictDoNothing();
  await tx
    .insert(supportHolidays)
    .values(DEFAULT_HOLIDAYS.map(([date, name]) => ({ date, name })))
    .onConflictDoNothing();
  const [seeded] = await tx
    .update(supportSettings)
    .set({ seededAt: new Date() })
    .where(eq(supportSettings.id, SETTINGS_ID))
    .returning();
  return seeded ?? row;
}

export async function loadHolidays(tx?: Transaction) {
  return (tx ?? db).select().from(supportHolidays).orderBy(asc(supportHolidays.date));
}

/** O horário pronto pras contas de prazo (semana, feriados e pausa). */
export async function loadSupportSchedule(
  settings?: SupportSettings,
  tx?: Transaction,
): Promise<{ settings: SupportSettings; schedule: SupportSchedule }> {
  const current = settings ?? (await loadSupportSettings(tx));
  const holidays = await loadHolidays(tx);
  return {
    settings: current,
    schedule: {
      weekly: current.weeklyHours,
      holidays: holidays.map((holiday) => holiday.date),
      pausedUntil:
        current.pausedUntil && current.pausedUntil.getTime() > Date.now()
          ? current.pausedUntil
          : null,
    },
  };
}

export function deadlineMinutesFor(settings: SupportSettings, priority: TicketPriority): number {
  return settings.deadlineMinutes[priority] ?? DEFAULT_DEADLINE_MINUTES[priority];
}

export function isPaused(settings: SupportSettings, now = new Date()): boolean {
  return Boolean(settings.pausedUntil && settings.pausedUntil.getTime() > now.getTime());
}

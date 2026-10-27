'use server';

import { randomBytes } from 'node:crypto';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  session,
  supportFaqAnswers,
  supportHolidays,
  supportKnownIssues,
  supportReplyTemplates,
  supportSettings,
  supportSituations,
  supportTickets,
  supportTopics,
  user,
} from '@/server/db/schema';
import { auth } from '@/server/auth/auth';
import { reportAuthError } from '@/server/auth/report-error';
import { SUPPORT_TICKET_TOPICS } from '@/features/support/catalog';
import { env } from '@/config/env';
import {
  isPlatformOwner,
  isStaffRole,
  parsePlatformOwners,
  staffRoleOf,
  STAFF_ROLES,
  withStaffRole,
  type StaffRole,
} from '@/features/support/staff-access';
import { requireStaff } from '@/features/support/server/staff-guard';
import { recordStaffAction } from './audit';
import { dueAtFor } from '@/features/support/server/tickets';
import { loadSupportSchedule, loadSupportSettings } from '@/features/support/server/settings';
import { TICKET_STATUSES } from '@/features/support/ticket-rules';
import { isAllowedFaqPath } from '@/features/support/faq';
import {
  parseDeadlines,
  parseIsoDate,
  parseSteps,
  parseWeeklyHours,
  parseWholeNumber,
} from '../settings-input';

const SETTINGS_PATH = '/admin/suporte/configuracoes';
const TEAM_PATH = '/admin/suporte/equipe';

function back(path: string, section: string, message: string, ok: boolean): never {
  const params = new URLSearchParams({ [ok ? 'salvo' : 'erro']: message });
  redirect(`${path}?${params}#${section}`);
}

function text(form: FormData, key: string, max: number): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Horário, pausa ou prazos mudaram: os prazos dos chamados que esperam são recalculados. */
async function recomputeDeadlines() {
  const { settings, schedule } = await loadSupportSchedule();
  const waiting = await db
    .select({ id: supportTickets.id, awaitingSince: supportTickets.awaitingSince, priority: supportTickets.priority })
    .from(supportTickets)
    .where(and(eq(supportTickets.status, 'open'), isNotNull(supportTickets.awaitingSince)));
  for (const ticket of waiting) {
    await db
      .update(supportTickets)
      .set({ dueAt: dueAtFor(ticket.awaitingSince, ticket.priority, settings, schedule), lateNotifiedAt: null })
      .where(eq(supportTickets.id, ticket.id));
  }
}

async function settingsAdmin() {
  const staff = await requireStaff(SETTINGS_PATH, 'support.settings');
  return { settings: await loadSupportSettings(), actorId: staff.user.id };
}

function refreshSupport() {
  revalidatePath(SETTINGS_PATH);
  revalidatePath('/suporte', 'layout');
  revalidatePath('/admin/chamados', 'layout');
}

export async function saveHours(form: FormData): Promise<void> {
  const { settings, actorId } = await settingsAdmin();
  const parsed = parseWeeklyHours(form);
  if (!parsed.ok) back(SETTINGS_PATH, 'horario', parsed.message, false);
  await db.update(supportSettings).set({ weeklyHours: parsed.value, updatedAt: new Date() }).where(eq(supportSettings.id, settings.id));
  await recomputeDeadlines();
  await recordStaffAction({ actorId, action: 'settings.hours_saved' });
  refreshSupport();
  back(SETTINGS_PATH, 'horario', 'Horário salvo. Os prazos dos chamados foram recalculados.', true);
}

export async function addHoliday(form: FormData): Promise<void> {
  const { actorId } = await settingsAdmin();
  const date = parseIsoDate(text(form, 'data', 10));
  const name = text(form, 'nome', 80);
  if (!date || name.length < 2) back(SETTINGS_PATH, 'feriados', 'Escolha a data e escreva o nome do feriado.', false);
  await db.insert(supportHolidays).values({ date, name }).onConflictDoUpdate({ target: supportHolidays.date, set: { name } });
  await recomputeDeadlines();
  await recordStaffAction({ actorId, action: 'settings.holiday_added', targetId: date });
  refreshSupport();
  back(SETTINGS_PATH, 'feriados', 'Feriado salvo.', true);
}

export async function removeHoliday(form: FormData): Promise<void> {
  const { actorId } = await settingsAdmin();
  const date = parseIsoDate(text(form, 'data', 10));
  if (date) await db.delete(supportHolidays).where(eq(supportHolidays.date, date));
  await recomputeDeadlines();
  if (date) await recordStaffAction({ actorId, action: 'settings.holiday_removed', targetId: date });
  refreshSupport();
  back(SETTINGS_PATH, 'feriados', 'Feriado removido.', true);
}

export async function savePause(form: FormData): Promise<void> {
  const { settings, actorId } = await settingsAdmin();
  if (form.get('acao') === 'tirar') {
    await db.update(supportSettings).set({ pausedUntil: null, pauseMessage: null, updatedAt: new Date() }).where(eq(supportSettings.id, settings.id));
    await recomputeDeadlines();
    await recordStaffAction({ actorId, action: 'settings.pause_ended' });
    refreshSupport();
    back(SETTINGS_PATH, 'pausa', 'Pausa encerrada. O suporte voltou a contar os prazos.', true);
  }
  const date = parseIsoDate(text(form, 'ate', 10));
  if (!date) back(SETTINGS_PATH, 'pausa', 'Escolha até quando o suporte fica em pausa.', false);
  // Volta no começo do dia escolhido (Brasília), quando o horário de atendimento abrir.
  const until = new Date(`${date}T00:00:00-03:00`);
  if (until.getTime() <= Date.now()) back(SETTINGS_PATH, 'pausa', 'Escolha uma data a partir de amanhã.', false);
  await db
    .update(supportSettings)
    .set({ pausedUntil: until, pauseMessage: text(form, 'mensagem', 300) || null, updatedAt: new Date() })
    .where(eq(supportSettings.id, settings.id));
  await recomputeDeadlines();
  await recordStaffAction({ actorId, action: 'settings.pause_started', detail: { until: date } });
  refreshSupport();
  back(SETTINGS_PATH, 'pausa', 'Suporte em pausa. As alunas veem o aviso e os contatos de WhatsApp.', true);
}

export async function saveDeadlines(form: FormData): Promise<void> {
  const { settings, actorId } = await settingsAdmin();
  const parsed = parseDeadlines(form);
  if (!parsed.ok) back(SETTINGS_PATH, 'prazos', parsed.message, false);
  const autoCloseDays = parseWholeNumber(form.get('encerrar-dias'), 1, 60);
  if (autoCloseDays === null) back(SETTINGS_PATH, 'prazos', 'O encerramento automático precisa ficar entre 1 e 60 dias.', false);
  await db
    .update(supportSettings)
    .set({ deadlineMinutes: parsed.value, autoCloseDays, updatedAt: new Date() })
    .where(eq(supportSettings.id, settings.id));
  await recomputeDeadlines();
  await recordStaffAction({ actorId, action: 'settings.deadlines_saved', detail: { autoCloseDays } });
  refreshSupport();
  back(SETTINGS_PATH, 'prazos', 'Prazos salvos. Os chamados que esperam foram recalculados.', true);
}

export async function saveDistribution(form: FormData): Promise<void> {
  const { settings, actorId } = await settingsAdmin();
  const max = parseWholeNumber(form.get('limite'), 1, 200);
  if (max === null) back(SETTINGS_PATH, 'distribuicao', 'O limite por pessoa precisa ficar entre 1 e 200 chamados.', false);
  await db
    .update(supportSettings)
    .set({ autoAssign: form.get('automatica') === '1', maxOpenPerPerson: max, updatedAt: new Date() })
    .where(eq(supportSettings.id, settings.id));
  await recordStaffAction({
    actorId,
    action: 'settings.distribution_saved',
    detail: { automatic: form.get('automatica') === '1', maxOpenPerPerson: max },
  });
  refreshSupport();
  back(SETTINGS_PATH, 'distribuicao', 'Distribuição salva.', true);
}

export async function saveRetention(form: FormData): Promise<void> {
  const { settings, actorId } = await settingsAdmin();
  const days = parseWholeNumber(form.get('anexos-dias'), 30, 3650);
  const years = parseWholeNumber(form.get('chamados-anos'), 1, 20);
  if (days === null || years === null)
    back(SETTINGS_PATH, 'guarda', 'Anexos: de 30 a 3650 dias. Chamados: de 1 a 20 anos.', false);
  await db
    .update(supportSettings)
    .set({ attachmentRetentionDays: days, ticketRetentionYears: years, updatedAt: new Date() })
    .where(eq(supportSettings.id, settings.id));
  await recordStaffAction({ actorId, action: 'settings.retention_saved', detail: { attachmentDays: days, ticketYears: years } });
  refreshSupport();
  back(SETTINGS_PATH, 'guarda', 'Guarda de dados salva.', true);
}

/** Um tema e as situações dele, num formulário só. */
export async function saveTopic(form: FormData): Promise<void> {
  const { actorId } = await settingsAdmin();
  const topicId = text(form, 'tema', 32);
  if (!(SUPPORT_TICKET_TOPICS as readonly string[]).includes(topicId)) back(SETTINGS_PATH, 'temas', 'Tema não encontrado.', false);
  const label = text(form, 'rotulo', 60);
  if (label.length < 2) back(SETTINGS_PATH, `tema-${topicId}`, 'Escreva o nome do tema.', false);
  const assignee = text(form, 'responsavel', 64) || null;
  await db.transaction(async (tx) => {
    await tx
      .update(supportTopics)
      .set({
        label,
        question: text(form, 'pergunta', 200) || label,
        example: text(form, 'exemplo', 300) || label,
        active: form.get('ativo') === '1',
        defaultAssigneeId: assignee,
        updatedAt: new Date(),
      })
      .where(eq(supportTopics.id, topicId));
    const situations = await tx.select().from(supportSituations).where(eq(supportSituations.topicId, topicId));
    for (const item of situations) {
      const prefix = `situacao-${item.id}`;
      const situationLabel = text(form, `${prefix}-rotulo`, 80);
      const priority = text(form, `${prefix}-prioridade`, 10);
      await tx
        .update(supportSituations)
        .set({
          label: situationLabel || item.label,
          priority: priority === 'high' ? 'high' : 'normal',
          active: form.get(`${prefix}-ativo`) === '1',
          updatedAt: new Date(),
        })
        .where(and(eq(supportSituations.topicId, topicId), eq(supportSituations.id, item.id)));
    }
  });
  await recordStaffAction({ actorId, action: 'settings.topic_saved', targetId: topicId });
  refreshSupport();
  back(SETTINGS_PATH, `tema-${topicId}`, 'Tema salvo.', true);
}

const statusAfterSchema = z.enum(TICKET_STATUSES).nullable();

export async function saveTemplate(form: FormData): Promise<void> {
  const { actorId } = await settingsAdmin();
  const id = text(form, 'id', 40);
  const title = text(form, 'titulo', 60);
  const body = text(form, 'texto', 2000);
  const status = statusAfterSchema.safeParse(text(form, 'status', 12) || null);
  if (title.length < 2 || body.length < 2 || !status.success)
    back(SETTINGS_PATH, 'respostas', 'Escreva o título e o texto da resposta pronta.', false);
  const values = { title, body, statusAfter: status.data, active: form.get('ativo') !== '0', updatedAt: new Date() };
  if (id) await db.update(supportReplyTemplates).set(values).where(eq(supportReplyTemplates.id, id));
  else {
    const existing = await db.select({ position: supportReplyTemplates.position }).from(supportReplyTemplates);
    await db.insert(supportReplyTemplates).values({ ...values, position: existing.length });
  }
  await recordStaffAction({ actorId, action: 'settings.template_saved', targetId: id || null });
  refreshSupport();
  back(SETTINGS_PATH, 'respostas', 'Resposta pronta salva.', true);
}

export async function saveFaqAnswer(form: FormData): Promise<void> {
  const { actorId } = await settingsAdmin();
  const id = text(form, 'id', 64);
  const title = text(form, 'titulo', 120);
  const steps = parseSteps(text(form, 'passos', 2000));
  if (!id || title.length < 2 || steps.length === 0)
    back(SETTINGS_PATH, 'faq', 'Escreva o título e pelo menos um passo.', false);
  const [answer] = await db.select({ links: supportFaqAnswers.links }).from(supportFaqAnswers).where(eq(supportFaqAnswers.id, id)).limit(1);
  if (!answer) back(SETTINGS_PATH, 'faq', 'Resposta não encontrada.', false);
  await db
    .update(supportFaqAnswers)
    .set({
      title,
      steps,
      links: answer.links.filter((link) => isAllowedFaqPath(link.path)),
      active: form.get('ativo') === '1',
      updatedAt: new Date(),
    })
    .where(eq(supportFaqAnswers.id, id));
  await recordStaffAction({ actorId, action: 'settings.faq_saved', targetId: id });
  refreshSupport();
  back(SETTINGS_PATH, 'faq', 'Resposta automática salva.', true);
}

export async function saveKnownIssue(form: FormData): Promise<void> {
  const staff = await requireStaff(SETTINGS_PATH, 'support.settings');
  const title = text(form, 'titulo', 120);
  const body = text(form, 'texto', 600);
  const topics = form.getAll('temas').map(String).filter((topic) => (SUPPORT_TICKET_TOPICS as readonly string[]).includes(topic));
  const endsOn = parseIsoDate(text(form, 'ate', 10));
  if (title.length < 3 || body.length < 3) back(SETTINGS_PATH, 'avisos', 'Escreva o título e o texto do aviso.', false);
  await db.insert(supportKnownIssues).values({
    title,
    body,
    topicIds: topics,
    endsAt: endsOn ? new Date(`${endsOn}T23:59:59-03:00`) : null,
    createdById: staff.user.id,
  });
  await recordStaffAction({ actorId: staff.user.id, action: 'settings.known_issue_published' });
  refreshSupport();
  back(SETTINGS_PATH, 'avisos', 'Aviso publicado. As alunas veem no suporte e ao abrir chamado.', true);
}

export async function endKnownIssue(form: FormData): Promise<void> {
  const { actorId } = await settingsAdmin();
  const id = text(form, 'id', 40);
  if (z.uuid().safeParse(id).success) {
    await db.update(supportKnownIssues).set({ endsAt: new Date() }).where(eq(supportKnownIssues.id, id));
    await recordStaffAction({ actorId, action: 'settings.known_issue_ended', targetId: id });
  }
  refreshSupport();
  back(SETTINGS_PATH, 'avisos', 'Aviso encerrado.', true);
}

/**
 * Mexer na equipe é só do dono da plataforma (não basta ser administrador). O servidor confere em
 * toda ação: a tela pode até mostrar o botão, mas quem decide é aqui.
 */
async function requirePlatformOwner() {
  const staffSession = await requireStaff(TEAM_PATH, 'team.manage');
  const owners = parsePlatformOwners(env.PLATFORM_OWNER_EMAILS);
  if (!isPlatformOwner(staffSession.user, owners))
    back(TEAM_PATH, 'equipe', 'Só um dono da plataforma convida, muda o cargo ou bloqueia pessoas da equipe.', false);
  return { staffSession, owners };
}

/** A pessoa alvo, que precisa existir e não pode ser outro dono (dono só muda pela configuração). */
async function loadTeamTarget(id: string, owners: readonly string[]) {
  const [target] = await db
    .select({ email: user.email, emailVerified: user.emailVerified, role: user.role })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!target) back(TEAM_PATH, 'equipe', 'Pessoa não encontrada.', false);
  if (isPlatformOwner(target, owners))
    back(TEAM_PATH, 'equipe', 'Um dono da plataforma só muda pela configuração do sistema.', false);
  return target;
}

const staffRoleSchema = z.enum(STAFF_ROLES);
const inviteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  role: staffRoleSchema,
});

/**
 * Convida pra equipe: cria a conta (o cadastro público é fechado) e manda o link de criar senha,
 * que vale 1 hora. Quem já tem conta só ganha o cargo (e continua aluna, se for).
 */
export async function inviteStaff(form: FormData): Promise<void> {
  const { staffSession: owner, owners } = await requirePlatformOwner();
  const parsed = inviteSchema.safeParse({ name: text(form, 'nome', 80), email: text(form, 'email', 254).toLowerCase(), role: text(form, 'cargo', 30) });
  if (!parsed.success) back(TEAM_PATH, 'convite', 'Confira o nome, o e-mail e o cargo.', false);
  const { name, email, role } = parsed.data;
  const [existing] = await db
    .select({ id: user.id, role: user.role, email: user.email, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing && isPlatformOwner(existing, owners))
    back(TEAM_PATH, 'convite', 'Esta pessoa é dona da plataforma: o cargo dela não muda por aqui.', false);
  if (existing) {
    await db.update(user).set({ role: withStaffRole(existing.role, role) }).where(eq(user.id, existing.id));
    await recordStaffAction({ actorId: owner.user.id, action: 'team.invited', targetId: existing.id, detail: { role, existingAccount: true } });
    revalidatePath(TEAM_PATH);
    back(TEAM_PATH, 'equipe', `${name} já tinha conta e agora faz parte da equipe.`, true);
  }
  let invitedId: string | null = null;
  try {
    const created = await auth.api.createUser({
      body: {
        email,
        name,
        password: randomBytes(48).toString('base64url'),
        // O plugin admin só tipa os papéis que conhece; o campo guarda texto livre.
        role: role as 'admin',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    invitedId = created.user.id;
    await auth.api.requestPasswordReset({ body: { email, redirectTo: '/redefinir-senha' }, headers: await headers() });
  } catch (error) {
    reportAuthError('convite da equipe do suporte', error);
    back(TEAM_PATH, 'convite', 'Não foi possível enviar o convite agora. Tente de novo.', false);
  }
  await recordStaffAction({ actorId: owner.user.id, action: 'team.invited', targetId: invitedId, detail: { role, existingAccount: false } });
  revalidatePath(TEAM_PATH);
  back(TEAM_PATH, 'equipe', `Convite enviado para ${email}. O link de criar senha vale 1 hora.`, true);
}

/** Muda o cargo ou tira da equipe (os chamados da pessoa voltam pra fila sozinhos). */
export async function changeStaffRole(form: FormData): Promise<void> {
  const { staffSession: admin, owners } = await requirePlatformOwner();
  const id = text(form, 'id', 64);
  const value = text(form, 'cargo', 30);
  if (id === admin.user.id) back(TEAM_PATH, 'equipe', 'Você não pode mudar o seu próprio cargo.', false);
  const next: StaffRole | null = value === 'remover' ? null : staffRoleSchema.safeParse(value).success ? (value as StaffRole) : null;
  if (value !== 'remover' && !next) back(TEAM_PATH, 'equipe', 'Escolha um cargo.', false);
  const target = await loadTeamTarget(id, owners);
  await db.update(user).set({ role: withStaffRole(target.role, next) }).where(eq(user.id, id));
  await recordStaffAction({
    actorId: admin.user.id,
    action: next ? 'team.role_changed' : 'team.removed',
    targetId: id,
    detail: { from: staffRoleOf(target.role), to: next },
  });
  revalidatePath(TEAM_PATH);
  revalidatePath('/admin/chamados', 'layout');
  back(TEAM_PATH, 'equipe', next ? 'Cargo salvo.' : 'Pessoa tirada da equipe. Os chamados dela voltaram pra fila.', true);
}

/** Bloqueia ou desbloqueia alguém da equipe (bloquear encerra as sessões). */
export async function blockStaff(form: FormData): Promise<void> {
  const { staffSession: admin, owners } = await requirePlatformOwner();
  const id = text(form, 'id', 64);
  const block = form.get('bloquear') === '1';
  if (id === admin.user.id) back(TEAM_PATH, 'equipe', 'Você não pode bloquear a sua conta.', false);
  const target = await loadTeamTarget(id, owners);
  // Aqui só se bloqueia a equipe; conta de aluna se cuida em Contas.
  if (!isStaffRole(target.role)) back(TEAM_PATH, 'equipe', 'Esta pessoa não faz parte da equipe.', false);
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ banned: block, banReason: block ? 'Bloqueada na equipe do suporte' : null, banExpires: null })
      .where(and(eq(user.id, id), ne(user.id, admin.user.id)));
    if (block) await tx.delete(session).where(eq(session.userId, id));
  });
  await recordStaffAction({ actorId: admin.user.id, action: block ? 'team.blocked' : 'team.unblocked', targetId: id });
  revalidatePath(TEAM_PATH);
  back(TEAM_PATH, 'equipe', block ? 'Pessoa bloqueada e sessões encerradas.' : 'Pessoa desbloqueada.', true);
}

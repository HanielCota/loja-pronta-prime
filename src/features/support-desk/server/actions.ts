'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { supportStaffStatus, supportTickets } from '@/server/db/schema';
import { SUPPORT_TICKET_TOPICS } from '@/features/support/catalog';
import { hasStaffPermission } from '@/features/support/staff-access';
import { readStaffSession } from '@/features/support/server/staff-guard';
import {
  assignTicket,
  changePriority,
  changeQueue,
  changeStatusByStaff,
  changeTopic,
  markTicketRead,
  TicketActionError,
  type StaffActor,
} from '@/features/support/server/tickets';
import { TICKET_PRIORITIES, type TicketPriority } from '@/features/support/ticket-rules';
import { countWaitingTickets } from './queries';

export type DeskActionState = { ok: boolean; message: string };

const IDLE: DeskActionState = { ok: false, message: '' };

async function actor(permission: 'support.answer' | 'support.triage' = 'support.triage') {
  const session = await readStaffSession(permission);
  if (!session) return null;
  const account = session.user;
  return { id: account.id, name: account.preferredName?.trim() || account.name, role: account.role } satisfies StaffActor;
}

async function ticketId(form: FormData): Promise<{ id: string; number: number } | null> {
  const number = Number(form.get('numero'));
  if (!Number.isInteger(number) || number < 1) return null;
  const [row] = await db
    .select({ id: supportTickets.id, number: supportTickets.number })
    .from(supportTickets)
    .where(eq(supportTickets.number, number))
    .limit(1);
  return row ?? null;
}

async function run(
  form: FormData,
  change: (id: string, staff: StaffActor) => Promise<unknown>,
  success: string,
): Promise<DeskActionState> {
  const staff = await actor();
  if (!staff) return { ok: false, message: 'Você não tem acesso a isso.' };
  const ticket = await ticketId(form);
  if (!ticket) return { ok: false, message: 'Chamado não encontrado.' };
  try {
    await change(ticket.id, staff);
  } catch (error) {
    if (error instanceof TicketActionError) return { ok: false, message: error.message };
    console.error('[support-desk] não foi possível mudar o chamado.');
    return { ok: false, message: 'Não foi possível salvar agora. Tente de novo.' };
  }
  revalidatePath(`/admin/chamados/${ticket.number}`);
  revalidatePath('/admin/chamados');
  return { ok: true, message: success };
}

/** Responsável: supervisor escolhe qualquer pessoa; atendente assume ou devolve. */
export async function assignAction(_state: DeskActionState, form: FormData): Promise<DeskActionState> {
  const target = String(form.get('responsavel') ?? '');
  return run(
    form,
    (id, staff) => assignTicket(id, staff, target === 'me' ? staff.id : target || null),
    target ? 'Responsável salva.' : 'Chamado devolvido pra fila.',
  );
}

export async function statusAction(_state: DeskActionState, form: FormData): Promise<DeskActionState> {
  const next = String(form.get('status'));
  if (next !== 'open' && next !== 'closed') return { ...IDLE, message: 'Escolha reabrir ou encerrar.' };
  return run(form, (id, staff) => changeStatusByStaff(id, staff, next), next === 'open' ? 'Chamado reaberto.' : 'Chamado encerrado.');
}

export async function priorityAction(_state: DeskActionState, form: FormData): Promise<DeskActionState> {
  const priority = String(form.get('prioridade'));
  if (!(TICKET_PRIORITIES as readonly string[]).includes(priority))
    return { ...IDLE, message: 'Escolha uma prioridade.' };
  return run(form, (id, staff) => changePriority(id, staff, priority as TicketPriority), 'Prioridade salva.');
}

export async function topicAction(_state: DeskActionState, form: FormData): Promise<DeskActionState> {
  const topic = String(form.get('tema'));
  if (!(SUPPORT_TICKET_TOPICS as readonly string[]).includes(topic)) return { ...IDLE, message: 'Escolha um tema.' };
  // A situação é a do tema antigo: ao trocar de tema, ela some (fica "sem detalhe").
  return run(form, (id, staff) => changeTopic(id, staff, topic, null), 'Tema salvo.');
}

export async function queueAction(_state: DeskActionState, form: FormData): Promise<DeskActionState> {
  const queue = String(form.get('fila'));
  if (queue !== 'general' && queue !== 'ombudsman') return { ...IDLE, message: 'Escolha a fila.' };
  return run(form, (id, staff) => changeQueue(id, staff, queue), queue === 'ombudsman' ? 'Movido para a Ouvidoria.' : 'Tirado da Ouvidoria.');
}

/** "Disponível / Em pausa": em pausa, a pessoa não recebe chamado novo da distribuição automática. */
export async function availabilityAction(_state: DeskActionState, form: FormData): Promise<DeskActionState> {
  const staff = await actor('support.answer');
  if (!staff) return { ok: false, message: 'Você não tem acesso a isso.' };
  const available = form.get('disponivel') === '1';
  await db
    .insert(supportStaffStatus)
    .values({ userId: staff.id, available })
    .onConflictDoUpdate({ target: supportStaffStatus.userId, set: { available, updatedAt: new Date() } });
  revalidatePath('/admin/chamados');
  return { ok: true, message: available ? 'Você está disponível.' : 'Você está em pausa.' };
}

/** Marca como lido até a mensagem que apareceu na tela. */
export async function markReadAction(number: number, messageId: string): Promise<void> {
  const staff = await actor('support.answer');
  if (!staff || !Number.isInteger(number)) return;
  const [row] = await db
    .select({ id: supportTickets.id, queue: supportTickets.queue })
    .from(supportTickets)
    .where(eq(supportTickets.number, number))
    .limit(1);
  if (!row) return;
  if (row.queue === 'ombudsman' && !hasStaffPermission(staff.role, 'support.ombudsman')) return;
  await markTicketRead(row.id, staff.id, messageId);
}

/** O número ao lado de "Chamados" no menu. */
export async function getWaitingTicketCount(): Promise<number> {
  const staff = await actor('support.answer');
  if (!staff) return 0;
  return countWaitingTickets(staff);
}

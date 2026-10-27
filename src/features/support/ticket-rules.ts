/**
 * Regras de um chamado: o que cada mensagem e cada ação fazem com o status, o relógio da resposta
 * e a responsável. Funções puras: o servidor lê o chamado com a linha travada, pergunta aqui o que
 * muda e grava o resultado e os eventos na mesma transação.
 */

import { supportMinutesBetween, type SupportSchedule } from './support-hours';

export const TICKET_STATUSES = ['open', 'answered', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type ClosedReason = 'requester' | 'staff' | 'automatic';

export type TicketEventType =
  | 'status_changed'
  | 'assigned'
  | 'priority_changed'
  | 'topic_changed'
  | 'queue_changed'
  | 'rated'
  | 'deadline_missed'
  | 'impersonation_started';

export type TicketEventDraft = { type: TicketEventType; from: string | null; to: string | null };

export type TicketState = {
  status: TicketStatus;
  assigneeId: string | null;
  awaitingSince: Date | null;
  firstResponseAt: Date | null;
  closedAt: Date | null;
  closedReason: ClosedReason | null;
  rating: number | null;
};

export type TicketPatch = Partial<TicketState> & {
  ratingComment?: string | null;
  ratedAt?: Date | null;
};

export type RuleResult =
  | { ok: true; patch: TicketPatch; events: TicketEventDraft[] }
  | { ok: false; status: 409 | 403; message: string };

function statusEvent(from: TicketStatus, to: TicketStatus): TicketEventDraft[] {
  if (from === to) return [];
  return [{ type: 'status_changed', from, to }];
}

/** A aluna escreveu: o chamado volta a esperar o suporte, mesmo encerrado (reabre). */
export function afterRequesterMessage(state: TicketState, now: Date): RuleResult {
  const reopening = state.status === 'closed';
  return {
    ok: true,
    patch: {
      status: 'open',
      awaitingSince: state.awaitingSince ?? now,
      ...(reopening
        ? { closedAt: null, closedReason: null, rating: null, ratingComment: null, ratedAt: null }
        : {}),
    },
    events: statusEvent(state.status, 'open'),
  };
}

export type StaffReply = {
  actorId: string;
  /** A responsável atual ainda é da equipe e está ativa? */
  assigneeActive: boolean;
  statusAfter: TicketStatus;
  now: Date;
};

/**
 * Resposta pública da equipe. Zera o relógio (mesmo enviada como "manter aguardando"), grava a
 * primeira resposta e, se quem respondeu não é a responsável ativa, assume o chamado.
 */
export function afterStaffReply(state: TicketState, reply: StaffReply): RuleResult {
  if (state.status === 'closed')
    return { ok: false, status: 409, message: 'Reabra o chamado antes de responder.' };
  const takesOver = !(state.assigneeId === reply.actorId || (state.assigneeId && reply.assigneeActive));
  const closing = reply.statusAfter === 'closed';
  const events: TicketEventDraft[] = [];
  if (takesOver) events.push({ type: 'assigned', from: state.assigneeId, to: reply.actorId });
  events.push(...statusEvent(state.status, reply.statusAfter));
  return {
    ok: true,
    patch: {
      status: reply.statusAfter,
      awaitingSince: null,
      firstResponseAt: state.firstResponseAt ?? reply.now,
      ...(takesOver ? { assigneeId: reply.actorId } : {}),
      ...(closing ? { closedAt: reply.now, closedReason: 'staff' as const } : {}),
    },
    events,
  };
}

/** A equipe muda o status sem mensagem: só reabrir ou encerrar (nunca "respondido" escondido). */
export function staffChangesStatus(state: TicketState, next: TicketStatus, now: Date): RuleResult {
  if (next === 'answered')
    return {
      ok: false,
      status: 409,
      message: 'Pra marcar como respondido, envie uma resposta.',
    };
  if (state.status === next) return { ok: true, patch: {}, events: [] };
  if (next === 'open')
    return {
      ok: true,
      patch: {
        status: 'open',
        awaitingSince: state.awaitingSince ?? now,
        closedAt: null,
        closedReason: null,
        rating: null,
        ratingComment: null,
        ratedAt: null,
      },
      events: statusEvent(state.status, 'open'),
    };
  return {
    ok: true,
    patch: { status: 'closed', awaitingSince: null, closedAt: now, closedReason: 'staff' },
    events: statusEvent(state.status, 'closed'),
  };
}

/** A aluna encerra ("Sim, resolveu" ou "Encerrar chamado"). */
export function requesterCloses(state: TicketState, now: Date): RuleResult {
  if (state.status === 'closed')
    return { ok: false, status: 409, message: 'Este chamado já está encerrado.' };
  return {
    ok: true,
    patch: { status: 'closed', awaitingSince: null, closedAt: now, closedReason: 'requester' },
    events: statusEvent(state.status, 'closed'),
  };
}

/** Encerramento automático por falta de retorno (o worker chama). */
export function closesAutomatically(state: TicketState, now: Date): RuleResult {
  if (state.status !== 'answered')
    return { ok: false, status: 409, message: 'Só encerra sozinho o que está respondido.' };
  return {
    ok: true,
    patch: { status: 'closed', awaitingSince: null, closedAt: now, closedReason: 'automatic' },
    events: statusEvent('answered', 'closed'),
  };
}

export function rates(state: TicketState, rating: number, comment: string, now: Date): RuleResult {
  if (state.status !== 'closed')
    return { ok: false, status: 409, message: 'Dá pra avaliar quando o chamado for encerrado.' };
  if (state.rating !== null)
    return { ok: false, status: 409, message: 'Você já avaliou este atendimento.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { ok: false, status: 409, message: 'Escolha de 1 a 5 estrelas.' };
  return {
    ok: true,
    patch: { rating, ratingComment: comment.trim() || null, ratedAt: now },
    events: [{ type: 'rated', from: null, to: String(rating) }],
  };
}

export type AssignRequest = {
  actorId: string;
  canAssignOthers: boolean;
  /** A responsável de agora, se ainda for da equipe e estiver ativa. */
  activeAssigneeId: string | null;
  targetId: string | null;
};

/**
 * Quem pode passar um chamado pra quem. Sem `support.assign_others`, a pessoa só assume um
 * chamado sem responsável ativa ou devolve o próprio pra fila.
 */
export function canAssign(request: AssignRequest): { ok: true } | { ok: false; message: string } {
  if (request.canAssignOthers) return { ok: true };
  const takingFree = request.targetId === request.actorId && request.activeAssigneeId === null;
  const givingBack =
    request.targetId === null && request.activeAssigneeId === request.actorId;
  const keeping = request.targetId === request.actorId && request.activeAssigneeId === request.actorId;
  if (takingFree || givingBack || keeping) return { ok: true };
  return { ok: false, message: 'Só supervisores podem passar chamados de outra pessoa.' };
}

export type DeadlineView = { status: TicketStatus; awaitingSince: Date | null; dueAt: Date | null };

export type ResponseTiming =
  | { state: 'none' }
  | { state: 'on_time'; remainingMs: number }
  | { state: 'overdue'; lateMs: number };

/**
 * Como está o prazo da resposta. `none`: a equipe não deve nada (respondido, encerrado ou
 * "manter aguardando", que para o relógio). O prazo já vem gravado em horário de atendimento.
 */
export function responseTiming(ticket: DeadlineView, now: Date): ResponseTiming {
  if (ticket.status !== 'open' || !ticket.awaitingSince || !ticket.dueAt) return { state: 'none' };
  const remainingMs = ticket.dueAt.getTime() - now.getTime();
  if (remainingMs < 0) return { state: 'overdue', lateMs: -remainingMs };
  return { state: 'on_time', remainingMs };
}

/**
 * Quanto do prazo já foi usado, de 0 a 1, pra barra do tempo. Conta só o horário de atendimento:
 * de madrugada a barra não anda, igual ao prazo. Sem prazo correndo, 0.
 */
export function responseWindowUsed(ticket: DeadlineView, now: Date, schedule: SupportSchedule): number {
  if (responseTiming(ticket, now).state === 'none' || !ticket.awaitingSince || !ticket.dueAt) return 0;
  const window = supportMinutesBetween(ticket.awaitingSince, ticket.dueAt, schedule);
  if (window <= 0) return 1;
  const used = supportMinutesBetween(ticket.awaitingSince, now, schedule);
  return Math.min(1, Math.max(0, used / window));
}

export function isOverdue(ticket: DeadlineView, now: Date): boolean {
  return responseTiming(ticket, now).state === 'overdue';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Quando um chamado respondido encerra sozinho: N dias corridos depois da última resposta pública
 * da equipe. Nota interna e mudança de prioridade não contam (não são retorno pra aluna). O worker
 * e as telas usam esta mesma conta, então a data prometida é a data em que o job encerra.
 */
export function autoCloseDate(
  ticket: { status: TicketStatus; awaitingSince: Date | null; lastStaffReplyAt: Date | null },
  autoCloseDays: number,
): Date | null {
  if (ticket.status !== 'answered' || ticket.awaitingSince || !ticket.lastStaffReplyAt) return null;
  return new Date(ticket.lastStaffReplyAt.getTime() + autoCloseDays * DAY_MS);
}

/** O corte do job: respondidos com a última resposta pública antes disto já podem encerrar. */
export function autoCloseCutoff(now: Date, autoCloseDays: number): Date {
  return new Date(now.getTime() - autoCloseDays * DAY_MS);
}

function describeDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} dias`;
}

/** O selo de prazo da fila: "Vence em 3 h", "Atrasado 40 min" (só em chamado aguardando). */
export function deadlineBadge(
  ticket: DeadlineView,
  now: Date,
): { label: string; tone: 'calm' | 'soon' | 'late' } | null {
  const timing = responseTiming(ticket, now);
  if (timing.state === 'none') return null;
  if (timing.state === 'overdue')
    return { label: `Atrasado ${describeDuration(Math.round(timing.lateMs / 60_000))}`, tone: 'late' };
  const minutes = Math.round(timing.remainingMs / 60_000);
  return { label: `Vence em ${describeDuration(minutes)}`, tone: minutes < 60 ? 'soon' : 'calm' };
}

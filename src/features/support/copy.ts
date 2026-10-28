import {
  brasiliaClock,
  describeWhen,
  formatHour,
  isWithinSupportHours,
  nextSupportOpening,
  type SupportSchedule,
} from './support-hours';
import { autoCloseDate, type ClosedReason, type TicketEventType, type TicketPriority, type TicketStatus } from './ticket-rules';

/** Textos do suporte que aparecem em mais de uma tela: a aluna e a equipe leem as mesmas palavras. */

export const STATUS_LABELS: Readonly<Record<TicketStatus, string>> = {
  open: 'Aguardando suporte',
  answered: 'Respondido',
  closed: 'Encerrado',
};

export const PRIORITY_LABELS: Readonly<Record<TicketPriority, string>> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

/** Número do chamado como a gente fala: "#1042". */
export function ticketCode(number: number): string {
  return `#${number}`;
}

/** "8 horas de atendimento" (ou "1 hora", "30 minutos"). */
export function describeDeadline(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos de atendimento`;
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? 'hora' : 'horas'} de atendimento`;
}

/** A promessa embaixo do botão de enviar, calculada da configuração. */
export function responsePromise(priority: 'normal' | 'high', deadlineMinutes: number): string {
  const when = `Respondemos em até ${describeDeadline(deadlineMinutes)}. A resposta chega por e-mail e aqui no suporte.`;
  if (priority === 'high') return `Casos como o seu são respondidos primeiro. ${when}`;
  return when;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

export function brasiliaDay(moment: Date): string {
  return dateFormat.format(moment);
}

export type CustomerTicketView = {
  status: TicketStatus;
  dueAt: Date | null;
  closedReason: ClosedReason | null;
  /** Quando a última resposta da equipe foi enviada (pra calcular o encerramento automático). */
  lastStaffReplyAt: Date | null;
};

/**
 * A linha de situação que a aluna vê no topo da conversa: uma frase só, que nunca mostra uma hora
 * no passado (atrasado admite o atraso) e sempre diz quando o respondido encerra sozinho.
 */
export function customerStateLine(
  ticket: CustomerTicketView,
  now: Date,
  schedule: SupportSchedule,
  autoCloseDays: number,
): string {
  if (ticket.status === 'closed') {
    if (ticket.closedReason === 'automatic')
      return 'Encerrado automaticamente por falta de retorno. Se precisar, é só responder que ele reabre.';
    if (ticket.closedReason === 'requester')
      return 'Você encerrou este chamado. Se precisar, é só responder que ele reabre.';
    return 'O suporte encerrou este chamado. Se precisar, é só responder que ele reabre.';
  }
  if (ticket.status === 'answered') {
    // A mesma conta do job: a data prometida é a data em que ele encerra.
    const closesAt =
      autoCloseDate({ status: 'answered', awaitingSince: null, lastStaffReplyAt: ticket.lastStaffReplyAt ?? now }, autoCloseDays) ?? now;
    return `O suporte respondeu. Sem retorno seu, o chamado é encerrado em ${brasiliaDay(closesAt)}.`;
  }
  if (ticket.dueAt && ticket.dueAt.getTime() < now.getTime())
    return 'A resposta está a caminho: o suporte já está cuidando.';
  if (!isWithinSupportHours(now, schedule)) {
    const opening = nextSupportOpening(now, schedule);
    if (opening) return `O suporte responde a partir de ${describeWhen(opening, now)}.`;
  }
  if (ticket.dueAt) return `O suporte responde até ${describeDueAt(ticket.dueAt, now)}.`;
  return 'O suporte já recebeu o seu chamado.';
}

function describeDueAt(dueAt: Date, now: Date): string {
  const when = describeWhen(dueAt, now);
  // `describeWhen` escreve "8h"; no prazo a hora exata ajuda mais ("hoje às 15:30").
  return when.replace(/\d+h(\d{2})?$/, brasiliaClock(dueAt));
}

export type EventView = {
  type: TicketEventType;
  fromValue: string | null;
  toValue: string | null;
  actorName: string | null;
  /** Nome de quem recebeu o chamado (eventos `assigned`). */
  targetName: string | null;
  automatic: boolean;
};

/** Eventos que a aluna vê no meio da conversa. Prioridade, fila e prazo ficam só com a equipe. */
export function customerEventSentence(event: EventView, topicLabel: (id: string) => string): string | null {
  if (event.type === 'status_changed') {
    if (event.toValue === 'closed' && event.automatic)
      return 'Chamado encerrado automaticamente por falta de retorno';
    if (event.toValue === 'closed' && event.actorName) return `${event.actorName} encerrou o chamado`;
    if (event.toValue === 'closed') return 'Chamado encerrado';
    if (event.fromValue === 'closed' && event.toValue === 'open') return 'Chamado reaberto';
    return null;
  }
  if (event.type === 'assigned') {
    if (!event.toValue || !event.targetName) return null;
    return `${event.targetName} está cuidando do seu chamado`;
  }
  if (event.type === 'topic_changed' && event.toValue)
    return `Tema alterado para ${topicLabel(event.toValue)}`;
  if (event.type === 'rated' && event.toValue) return `Atendimento avaliado com ${event.toValue} de 5`;
  return null;
}

/** Eventos no histórico da equipe ("Ana assumiu o chamado", "prioridade Normal → Alta"). */
export function staffEventSentence(event: EventView, topicLabel: (id: string) => string): string {
  const actor = event.automatic ? 'Sistema' : (event.actorName ?? 'Ex-membro da equipe');
  switch (event.type) {
    case 'status_changed':
      if (event.toValue === 'closed' && event.automatic)
        return 'Encerrado automaticamente por falta de retorno';
      return `${actor}: ${STATUS_LABELS[event.fromValue as TicketStatus] ?? event.fromValue} → ${STATUS_LABELS[event.toValue as TicketStatus] ?? event.toValue}`;
    case 'assigned':
      if (!event.toValue) return `${actor} devolveu para a fila`;
      if (event.actorName && event.targetName === event.actorName) return `${actor} assumiu o chamado`;
      return `${actor} passou para ${event.targetName ?? 'Ex-membro da equipe'}`;
    case 'priority_changed':
      return `${actor}: prioridade ${PRIORITY_LABELS[event.fromValue as TicketPriority] ?? event.fromValue} → ${PRIORITY_LABELS[event.toValue as TicketPriority] ?? event.toValue}`;
    case 'topic_changed':
      return `${actor}: tema ${topicLabel(event.fromValue ?? '')} → ${topicLabel(event.toValue ?? '')}`;
    case 'queue_changed':
      return event.toValue === 'ombudsman'
        ? `${actor} moveu para a Ouvidoria`
        : `${actor} tirou da Ouvidoria`;
    case 'rated':
      return `Aluna avaliou com ${event.toValue} de 5`;
    case 'deadline_missed':
      return 'Prazo de resposta perdido';
    case 'impersonation_started':
      return `${actor} entrou na conta da aluna`;
    default:
      return actor;
  }
}

export { formatHour };

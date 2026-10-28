import { cn } from '@/lib/utils';
import { PRIORITY_LABELS, STATUS_LABELS } from '../copy';
import type { TicketPriority, TicketStatus } from '../ticket-rules';

const badge =
  'inline-flex w-fit items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium forced-colors:border forced-colors:border-[CanvasText]';

/** A situação sempre escrita (nunca só a cor). */
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        badge,
        status === 'open'
          ? 'bg-primary-soft text-link'
          : status === 'answered'
            ? 'bg-muted text-progress-text'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={cn(
        badge,
        priority === 'urgent' || priority === 'high'
          ? 'bg-destructive-soft text-destructive'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

/** "Vence em 3 h", "Atrasado 40 min": o atraso em tom de erro, sempre com o texto. */
export function DeadlineBadge({ label, tone }: { label: string; tone: 'calm' | 'soon' | 'late' }) {
  return (
    <span
      className={cn(
        badge,
        tone === 'late'
          ? 'bg-destructive-soft text-destructive'
          : tone === 'soon'
            ? 'bg-primary-soft font-semibold text-link'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

/** A bolinha de "Nova resposta"/"Mensagem nova", com o texto pro leitor de tela. */
export function UnreadDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-link">
      <span aria-hidden="true" className="size-2.5 rounded-full bg-primary forced-colors:bg-[Highlight]" />
      {label}
    </span>
  );
}

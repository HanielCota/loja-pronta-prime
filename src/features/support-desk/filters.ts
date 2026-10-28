import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from '@/features/support/ticket-rules';
import { SUPPORT_TICKET_TOPICS } from '@/features/support/catalog';
import { PRODUCT_IDS, type ProductId } from '@/config/products';

/** As abas da fila. A Ouvidoria só aparece pra quem cuida dela. */
export const STAFF_QUEUES = ['todos', 'sem-responsavel', 'minha', 'atrasados', 'ouvidoria'] as const;
export type StaffQueue = (typeof STAFF_QUEUES)[number];

export const STAFF_QUEUE_LABELS: Readonly<Record<StaffQueue, string>> = {
  todos: 'Todos',
  'sem-responsavel': 'Sem responsável',
  minha: 'Minha caixa',
  atrasados: 'Atrasados',
  ouvidoria: 'Ouvidoria',
};

export const STAFF_QUEUE_EMPTY: Readonly<Record<StaffQueue, string>> = {
  todos: 'Nenhum chamado',
  'sem-responsavel': 'Nenhum chamado esperando alguém',
  minha: 'Sua caixa está vazia',
  atrasados: 'Nada atrasado',
  ouvidoria: 'Nenhum chamado na Ouvidoria',
};

export const STAFF_PAGE_SIZE = 25;

export type StaffTicketFilters = {
  queue: StaffQueue;
  q: string;
  status: TicketStatus | '';
  priority: TicketPriority | '';
  topic: string;
  assignee: string;
  channel: 'platform' | 'public_form' | '';
  product: ProductId | '';
  page: number;
};

function pick<T extends string>(value: string | null, options: readonly T[]): T | '' {
  return value && (options as readonly string[]).includes(value) ? (value as T) : '';
}

/** Lê os filtros da URL (funcionam sem JavaScript: um formulário GET). Valor estranho vira vazio. */
export function parseStaffFilters(params: URLSearchParams, canSeeOmbudsman: boolean): StaffTicketFilters {
  const queue = pick(params.get('fila'), STAFF_QUEUES) || 'todos';
  const page = Number.parseInt(params.get('pagina') ?? '1', 10);
  return {
    queue: queue === 'ouvidoria' && !canSeeOmbudsman ? 'todos' : queue,
    q: (params.get('q') ?? '').trim().slice(0, 120),
    status: pick(params.get('status'), TICKET_STATUSES),
    priority: pick(params.get('prioridade'), TICKET_PRIORITIES),
    topic: pick(params.get('tema'), SUPPORT_TICKET_TOPICS),
    assignee: (params.get('responsavel') ?? '').slice(0, 64),
    channel: pick(params.get('canal'), ['platform', 'public_form'] as const),
    product: pick(params.get('produto'), PRODUCT_IDS),
    page: Number.isInteger(page) && page > 0 && page < 10_000 ? page : 1,
  };
}

/** A URL dos filtros atuais com algumas trocas (a página volta pra 1, menos quando é ela que muda). */
export function staffFilterHref(
  current: URLSearchParams,
  updates: Readonly<Record<string, string>>,
): string {
  const next = new URLSearchParams(current);
  if (!('pagina' in updates)) next.delete('pagina');
  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      next.set(key, value);
      continue;
    }
    next.delete(key);
  }
  const query = next.toString();
  return query ? `/admin/chamados?${query}` : '/admin/chamados';
}

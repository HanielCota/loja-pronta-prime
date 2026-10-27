import { PRODUCT_IDS } from '@/config/products';
import { PRODUCTS } from '@/features/products/catalog';
import { readClock } from '@/features/support/clock';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, ChevronRight, Download, Inbox, Search } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { SelectMenu } from '@/components/ui/select-menu';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { AutoRefresh } from '@/features/admin/components/auto-refresh';
import { panelCard } from '@/features/member/components/area-shell';
import { DEFAULT_SUPPORT_CATALOG } from '@/features/support/catalog';
import { PRIORITY_LABELS, STATUS_LABELS, ticketCode } from '@/features/support/copy';
import { formatMoment } from '@/features/support/components/message-list';
import {
  DeadlineBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
  UnreadDot,
} from '@/features/support/components/ticket-badges';
import { hasStaffPermission } from '@/features/support/staff-access';
import { requireStaff } from '@/features/support/server/staff-guard';
import { deadlineBadge, TICKET_PRIORITIES, TICKET_STATUSES } from '@/features/support/ticket-rules';
import { AvailabilityToggle } from '@/features/support-desk/components/desk-forms';
import {
  parseStaffFilters,
  STAFF_QUEUE_EMPTY,
  STAFF_QUEUE_LABELS,
  STAFF_QUEUES,
  staffFilterHref,
} from '@/features/support-desk/filters';
import { listStaffTickets } from '@/features/support-desk/server/queries';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';
import { db } from '@/server/db';
import { supportStaffStatus } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Chamados', robots: { index: false, follow: false } };

const linkClass =
  'inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-body text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * A fila do suporte: abas (Todos, Sem responsável, Minha caixa, Atrasados e, pra quem cuida,
 * Ouvidoria), filtros na URL (funcionam sem JavaScript) e o prazo de cada chamado.
 */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireStaff('/admin/chamados', 'support.answer');
  const { user } = session;
  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) => {
      const item = getParam(value);
      return item ? [[key, item]] : [];
    }),
  );
  const canOmbudsman = hasStaffPermission(user.role, 'support.ombudsman');
  const filters = parseStaffFilters(params, canOmbudsman);
  const now = readClock();
  const [list, [status]] = await Promise.all([
    listStaffTickets({ id: user.id, role: user.role }, filters, now),
    db.select({ available: supportStaffStatus.available }).from(supportStaffStatus).where(eq(supportStaffStatus.userId, user.id)).limit(1),
  ]);
  const queues = STAFF_QUEUES.filter((queue) => queue !== 'ouvidoria' || canOmbudsman);
  const canExport = hasStaffPermission(user.role, 'support.metrics');
  const answerStaff = list.staff.filter((member) => hasStaffPermission(member.role, 'support.answer'));

  return (
    <AdminPage
      title="Chamados"
      intro="Pegue os chamados sem responsável e responda dentro do prazo de cada prioridade."
      actions={
        hasStaffPermission(user.role, 'support.metrics') ? (
          <Button asChild variant="soft" className="sm:w-auto sm:px-6">
            <Link href="/admin/suporte/desempenho">
              <BarChart3 aria-hidden="true" />
              Desempenho
            </Link>
          </Button>
        ) : null
      }
    >
      <AutoRefresh everyMs={30_000} />
      <div className={cn(panelCard, '!p-5')}>
        <AvailabilityToggle available={status?.available ?? true} />
      </div>
      <nav aria-label="Fila de chamados" className="flex flex-wrap gap-2">
        {queues.map((queue) => (
          <Link
            key={queue}
            href={staffFilterHref(params, { fila: queue === 'todos' ? '' : queue })}
            aria-current={filters.queue === queue ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-body outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              filters.queue === queue ? 'bg-primary-soft font-semibold text-link' : 'bg-card text-foreground shadow-card hover:bg-muted',
            )}
          >
            {STAFF_QUEUE_LABELS[queue]}
            <span className="tabular-nums text-muted-foreground">{list.counts[queue] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <section aria-labelledby="ticket-list" className={cn(panelCard, 'gap-5 !p-5 sm:!p-6')}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h2 id="ticket-list" className="text-title font-semibold">
            {STAFF_QUEUE_LABELS[filters.queue]} <span className="text-muted-foreground">({list.total})</span>
          </h2>
          {canExport ? (
            <a className={linkClass} href={`/admin/chamados/exportar?${params}`}>
              <Download aria-hidden="true" className="size-5" />
              Exportar CSV
            </a>
          ) : null}
        </div>
        <search>
          <form action="/admin/chamados" className="flex flex-col gap-4">
            {filters.queue !== 'todos' ? <input type="hidden" name="fila" value={filters.queue} /> : null}
            <FloatingLabelInput id="ticket-search" label="Buscar por assunto, aluna, e-mail, número ou mensagem" name="q" type="search" defaultValue={filters.q} maxLength={120} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-status">Status</Label>
                <SelectMenu id="filter-status" name="status" defaultValue={filters.status}>
                  <option value="">Todos os status</option>
                  {TICKET_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </SelectMenu>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-priority">Prioridade</Label>
                <SelectMenu id="filter-priority" name="prioridade" defaultValue={filters.priority}>
                  <option value="">Todas as prioridades</option>
                  {TICKET_PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </option>
                  ))}
                </SelectMenu>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-topic">Tema</Label>
                <SelectMenu id="filter-topic" name="tema" defaultValue={filters.topic}>
                  <option value="">Todos os temas</option>
                  {DEFAULT_SUPPORT_CATALOG.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.label}
                    </option>
                  ))}
                </SelectMenu>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-assignee">Responsável</Label>
                <SelectMenu id="filter-assignee" name="responsavel" defaultValue={filters.assignee}>
                  <option value="">Todas as pessoas</option>
                  <option value="nenhum">Sem responsável</option>
                  {answerStaff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </SelectMenu>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-channel">Canal</Label>
                <SelectMenu id="filter-channel" name="canal" defaultValue={filters.channel}>
                  <option value="">Todos os canais</option>
                  <option value="platform">Plataforma</option>
                  <option value="public_form">Formulário de acesso</option>
                </SelectMenu>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-product">Produto</Label>
                <SelectMenu id="filter-product" name="produto" defaultValue={filters.product}>
                  <option value="">Todos os produtos</option>
                  {PRODUCT_IDS.map((value) => (
                    <option key={value} value={value}>
                      {PRODUCTS[value].name}
                    </option>
                  ))}
                </SelectMenu>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" variant="soft" size="inline" className="px-5">
                <Search aria-hidden="true" />
                Filtrar
              </Button>
              <Link className={linkClass} href={staffFilterHref(new URLSearchParams(), { fila: filters.queue === 'todos' ? '' : filters.queue })}>
                Limpar filtros
              </Link>
            </div>
          </form>
        </search>
        {list.rows.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left text-body tabular-nums">
                <caption className="sr-only">Chamados da fila {STAFF_QUEUE_LABELS[filters.queue]}</caption>
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    {['Nº e assunto', 'Aluna', 'Prioridade', 'Responsável', 'Status', 'Prazo', 'Atualizado'].map((label) => (
                      <th key={label} scope="col" className="px-3 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((ticket) => {
                    const deadline = deadlineBadge(ticket, now);
                    return (
                      <tr key={ticket.id} className="border-b border-border last:border-0 hover:bg-muted">
                        <td className="max-w-80 px-3 py-4">
                          <Link className={cn(linkClass, 'font-semibold break-words')} href={`/admin/chamados/${ticket.number}`}>
                            <span className="text-muted-foreground">{ticketCode(ticket.number)}</span> {ticket.subject}
                            <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
                          </Link>
                          {ticket.unread && ticket.status !== 'closed' ? <UnreadDot label="Mensagem nova" /> : null}
                          {ticket.channel === 'public_form' && !ticket.emailConfirmedAt ? (
                            <span className="block text-sm text-destructive">E-mail ainda não confirmado</span>
                          ) : null}
                        </td>
                        <td className="max-w-56 px-3 py-4">
                          <span className="block break-words">{ticket.requesterName}</span>
                          <span className="block text-sm break-words text-muted-foreground">{ticket.requesterEmail}</span>
                        </td>
                        <td className="px-3 py-4">
                          <TicketPriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="px-3 py-4 text-sm">{ticket.assigneeName ?? <span className="text-muted-foreground">Sem responsável</span>}</td>
                        <td className="px-3 py-4">
                          <TicketStatusBadge status={ticket.status} />
                        </td>
                        <td className="px-3 py-4">{deadline ? <DeadlineBadge {...deadline} /> : <span className="text-sm text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-4 text-sm text-muted-foreground">{formatMoment(ticket.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border lg:hidden">
              {list.rows.map((ticket) => {
                const deadline = deadlineBadge(ticket, now);
                return (
                  <li key={ticket.id}>
                    <Link href={`/admin/chamados/${ticket.number}`} className="flex min-h-11 flex-col gap-2 rounded-2xl px-2 py-4 text-body outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                      <span className="flex items-start justify-between gap-2 font-semibold break-words">
                        {ticketCode(ticket.number)} · {ticket.subject}
                        <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {ticket.requesterName} · {ticket.assigneeName ?? 'Sem responsável'}
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <TicketStatusBadge status={ticket.status} />
                        <TicketPriorityBadge priority={ticket.priority} />
                        {deadline ? <DeadlineBadge {...deadline} /> : null}
                      </span>
                      {ticket.unread && ticket.status !== 'closed' ? <UnreadDot label="Mensagem nova" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Inbox aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="text-body font-semibold">{STAFF_QUEUE_EMPTY[filters.queue]}</p>
          </div>
        )}
        {list.pages > 1 ? (
          <nav aria-label="Páginas de chamados" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {filters.page > 1 ? <Link className={linkClass} href={staffFilterHref(params, { pagina: String(filters.page - 1) })}>Anterior</Link> : <span />}
            <p className="text-body text-muted-foreground">
              Página {filters.page} de {list.pages}
            </p>
            {filters.page < list.pages ? <Link className={linkClass} href={staffFilterHref(params, { pagina: String(filters.page + 1) })}>Próxima</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </AdminPage>
  );
}

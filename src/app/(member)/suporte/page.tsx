import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MessageSquarePlus, MessagesSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { SelectMenu } from '@/components/ui/select-menu';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { requireStudent } from '@/features/products/server/access';
import { STATUS_LABELS } from '@/features/support/copy';
import { SupportHoursNote } from '@/features/support/components/support-hours-note';
import { TicketStatusBadge, UnreadDot } from '@/features/support/components/ticket-badges';
import { WhatsappAlternatives } from '@/features/support/components/whatsapp-alternatives';
import { loadSupportFrame } from '@/features/support/server/page-data';
import { listActiveKnownIssues, listMyTickets, parseMyTicketFilters } from '@/features/support/server/queries';
import { TICKET_STATUSES } from '@/features/support/ticket-rules';
import { formatMoment } from '@/features/support/components/message-list';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Suporte' };

const linkClass =
  'inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-body text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Suporte da aluna: os chamados dela, o horário de atendimento e, como segunda opção, o WhatsApp
 * de sempre. Comum aos dois produtos (como o perfil), fora das abas das áreas.
 */
export default async function SupportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { session } = await requireStudent('/suporte');
  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) => {
      const item = getParam(value);
      return item ? [[key, item]] : [];
    }),
  );
  const filters = parseMyTicketFilters(params);
  const [list, frame, issues] = await Promise.all([
    listMyTickets(session.user.id, filters),
    loadSupportFrame(),
    listActiveKnownIssues(),
  ]);
  const page = (number: number) => {
    const next = new URLSearchParams(params);
    next.set('pagina', String(number));
    return `/suporte?${next}`;
  };
  const filtering = Boolean(filters.q || filters.status);

  return (
    <AreaShell
      account={session.user}
      hasChoice
      title="Suporte"
      intro="Abra um chamado e acompanhe a resposta por aqui. Chamados respondidos ficam abertos por 7 dias esperando o seu retorno."
    >
      {issues.map((issue) => (
        <div key={issue.id} role="note" className="rounded-card bg-primary-soft px-6 py-5 text-body">
          <p className="font-semibold">{issue.title}</p>
          <p className="mt-1 text-pretty">{issue.body}</p>
        </div>
      ))}
      <section aria-labelledby="my-tickets" className={cn(panelCard, 'gap-5')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="my-tickets" className="text-title font-semibold">
            Seus chamados <span className="text-muted-foreground">({list.total})</span>
          </h2>
          <Button asChild className="sm:w-auto">
            <Link href="/suporte/novo">
              <MessageSquarePlus aria-hidden="true" />
              Abrir chamado
            </Link>
          </Button>
        </div>
        <SupportHoursNote hours={frame.hours} notice={frame.notice} pause={frame.pause} />
        {list.total || filtering ? (
          <search>
            <form action="/suporte" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FloatingLabelInput id="ticket-search" label="Buscar pelo assunto" name="q" type="search" defaultValue={filters.q} maxLength={120} />
              </div>
              <div className="flex flex-col gap-2 sm:w-56">
                <Label htmlFor="ticket-status">Situação</Label>
                <SelectMenu id="ticket-status" name="status" defaultValue={filters.status}>
                  <option value="">Todas</option>
                  {TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </SelectMenu>
              </div>
              <Button type="submit" variant="soft" size="inline" className="px-5">
                <Search aria-hidden="true" />
                Filtrar
              </Button>
            </form>
          </search>
        ) : null}
        {list.rows.length ? (
          <ul className="divide-y divide-border">
            {list.rows.map((ticket) => (
              <li key={ticket.number}>
                <Link
                  href={`/suporte/${ticket.number}`}
                  className="grid min-h-11 gap-2 rounded-2xl px-2 py-4 text-body outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold break-words">{ticket.subject}</span>
                    {ticket.unread ? <UnreadDot label="Nova resposta" /> : null}
                  </span>
                  <TicketStatusBadge status={ticket.status} />
                  <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    Atualizado em {formatMoment(ticket.updatedAt)}
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <MessagesSquare aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="text-body font-semibold">{filtering ? 'Nenhum chamado encontrado' : 'Você ainda não abriu chamados'}</p>
            <p className="max-w-[45ch] text-body text-pretty text-muted-foreground">
              {filtering
                ? 'Ajuste a busca pra encontrar outros chamados.'
                : 'Quando precisar de ajuda com o curso, a loja ou o acesso, abra um chamado. A resposta aparece aqui.'}
            </p>
            {filtering ? null : (
              <Button asChild variant="soft" className="w-auto px-6">
                <Link href="/suporte/novo">Abrir chamado</Link>
              </Button>
            )}
          </div>
        )}
        {list.pages > 1 ? (
          <nav aria-label="Páginas de chamados" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {filters.page > 1 ? <Link className={linkClass} href={page(filters.page - 1)}>Anterior</Link> : <span />}
            <p className="text-body text-muted-foreground">
              Página {filters.page} de {list.pages}
            </p>
            {filters.page < list.pages ? <Link className={linkClass} href={page(filters.page + 1)}>Próxima</Link> : <span />}
          </nav>
        ) : null}
      </section>
      <section className={cn(panelCard, 'gap-4')} aria-label="Outras formas de falar com o suporte">
        <WhatsappAlternatives contacts={frame.contacts} source="platform" />
      </section>
    </AreaShell>
  );
}

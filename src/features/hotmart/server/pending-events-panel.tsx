import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { panelCard } from '@/features/member/components/area-shell';
import { hotmartEventForReplay } from '../recovery';
import { retryHotmartPendingEvents } from './actions';
import { HOTMART_PENDING_PAGE_SIZE, type getHotmartPendingState } from './pending-events';

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export function HotmartPendingEvents({
  state,
  query,
  page,
}: {
  state: Awaited<ReturnType<typeof getHotmartPendingState>>;
  query: string;
  page: number;
}) {
  const pages = Math.max(1, Math.ceil(state.total / HOTMART_PENDING_PAGE_SIZE));
  const pageHref = (number: number) =>
    `/admin/hotmart?${new URLSearchParams({ q: query, pagina: String(number) })}#hotmart-pending`;
  return (
    <section className={`${panelCard} gap-5`} aria-labelledby="hotmart-pending">
      <h2 id="hotmart-pending" className="text-title font-semibold">
        Pendências de acesso ({state.all})
      </h2>
      <p className="text-body text-muted-foreground">
        Estes avisos precisam de correção. Configure o produto certo para recuperar as compras. Um
        produto desconhecido não libera acesso automaticamente.
      </p>
      <form
        method="get"
        action="/admin/hotmart"
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <FloatingLabelInput
            id="hotmart-search"
            name="q"
            label="Buscar email, produto ou transação"
            defaultValue={query}
            maxLength={120}
          />
        </div>
        <Button type="submit" size="inline" variant="soft" className="px-5">
          Buscar
        </Button>
      </form>
      {state.all > 0 ? (
        <form action={retryHotmartPendingEvents} className="flex flex-col gap-2">
          <Button type="submit" variant="soft">
            <RefreshCw aria-hidden="true" />
            Tentar recuperar compras
          </Button>
          <p className="text-sm text-muted-foreground">
            Cada tentativa trata até 50 avisos com produto configurado e dados completos. Se ainda
            houver pendências, corrija o motivo indicado e tente de novo.
          </p>
        </form>
      ) : null}
      {state.events.length ? (
        <ol className="divide-y divide-border">
          {state.events.map(({ event, configured }) => (
            <li key={event.id} className="flex min-w-0 flex-col gap-3 py-5 text-body">
              <div>
                <h3 className="font-semibold break-words">
                  {event.productName || 'Produto sem nome no aviso'}
                </h3>
                <p className="text-muted-foreground">
                  ID Hotmart: {event.productId ?? 'Não informado'}
                </p>
                <p className="break-all">{event.buyerEmail}</p>
                <p className="text-destructive">{event.result}</p>
                <p className="text-sm text-muted-foreground">
                  {dateFormat.format(event.receivedAt)}
                </p>
              </div>
              {!configured ? (
                <Button asChild variant="soft">
                  <Link href={`/admin/experts?codigo=${encodeURIComponent(event.productUcode)}`}>
                    Configurar produto
                  </Link>
                </Button>
              ) : null}
              {!hotmartEventForReplay(event) ? (
                <p className="text-body text-muted-foreground">
                  Faltam dados originais para recuperar este aviso. Solicite o reenvio na Hotmart
                  depois de configurar o produto. A data de recebimento não substitui a data da
                  compra.
                </p>
              ) : configured ? (
                <p className="text-body text-muted-foreground">
                  Produto configurado. Use “Tentar recuperar compras”.
                </p>
              ) : null}
              <details>
                <summary className="min-h-11 cursor-pointer text-link">
                  Ver identificação da compra
                </summary>
                <dl className="space-y-2 text-sm break-all text-muted-foreground">
                  <div>
                    <dt>Transação</dt>
                    <dd>{event.transaction}</dd>
                  </div>
                  <div>
                    <dt>Código do produto</dt>
                    <dd>{event.productUcode}</dd>
                  </div>
                  <div>
                    <dt>Aviso</dt>
                    <dd>
                      {event.id} · {event.event}
                    </dd>
                  </div>
                </dl>
              </details>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-body text-muted-foreground">
          {query ? 'Nenhuma pendência encontrada para essa busca.' : 'Nenhuma pendência de acesso.'}
        </p>
      )}
      {pages > 1 ? (
        <nav
          aria-label="Páginas das pendências"
          className="flex flex-wrap items-center gap-5 text-body"
        >
          <span>
            Página {page} de {pages}
          </span>
          {page > 1 ? (
            <Button asChild variant="link" size="inline">
              <Link href={pageHref(page - 1)}>Anterior</Link>
            </Button>
          ) : null}
          {page < pages ? (
            <Button asChild variant="link" size="inline">
              <Link href={pageHref(page + 1)}>Próxima</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}

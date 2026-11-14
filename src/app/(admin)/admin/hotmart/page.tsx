import type { Metadata } from 'next';
import { env } from '@/config/env';
import { panelCard } from '@/features/member/components/area-shell';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { HotmartSettingsForm } from '@/features/hotmart/components/settings-form';
import { getHotmartAdminState } from '@/features/hotmart/server/actions';
import { getHotmartPendingState } from '@/features/hotmart/server/pending-events';
import { HotmartPendingEvents } from '@/features/hotmart/server/pending-events-panel';
import { getParam, parsePageNumber, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Compras Hotmart · Administração' };

const purchaseEventLabels: Record<string, string> = {
  PURCHASE_APPROVED: 'Compra aprovada',
  PURCHASE_COMPLETE: 'Compra concluída',
  PURCHASE_REFUNDED: 'Compra reembolsada',
  PURCHASE_CHARGEBACK: 'Pagamento contestado',
  PURCHASE_CANCELED: 'Compra cancelada',
};

export default async function HotmartAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin('/admin/hotmart');
  const params = await searchParams;
  const query = (getParam(params.q) ?? '').trim().slice(0, 120);
  const historyQuery = (getParam(params.historico) ?? '').trim().slice(0, 200);
  const page = parsePageNumber(params.pagina);
  const [state, pending] = await Promise.all([
    getHotmartAdminState(historyQuery),
    getHotmartPendingState(query, page),
  ]);
  const result = getParam(params.resultado);
  const url = new URL('/api/hotmart/webhook', env.BETTER_AUTH_URL).toString();
  return (
    <AdminPage title="Compras da Hotmart">
      {result ? (
        <output className="mb-6 block text-body text-muted-foreground">
          {result === 'retry-failed'
            ? 'Alguns avisos não puderam ser recuperados. A configuração salva foi mantida. Confira as pendências e tente de novo.'
            : result === 'configured'
              ? 'Produto configurado. Os avisos com dados completos foram verificados. Confira as pendências abaixo.'
              : 'Tentativa concluída. Confira abaixo os avisos que ainda precisam de correção.'}
        </output>
      ) : null}
      <HotmartPendingEvents state={pending} query={query} page={page} />
      <section className={`${panelCard} mt-6 gap-5`} aria-labelledby="hotmart-config">
        <div>
          <h2 id="hotmart-config" className="text-title font-semibold">
            Configurar produtos
          </h2>
          <p className="text-body text-muted-foreground">
            {state.configured && state.mappings.length
              ? 'Configuração salva'
              : 'Ainda não configurada'}
            . Cada compra libera somente o acesso indicado abaixo.
          </p>
        </div>
        <p className="text-body break-all">
          Endereço para cadastrar na Hotmart: <strong>{url}</strong>
        </p>
        <p className="text-body text-pretty text-muted-foreground">
          Depois de cadastrar o endereço na Hotmart, confira uma compra de teste no histórico
          abaixo. O email automático de primeiro acesso está em preparação.
        </p>
        <HotmartSettingsForm
          configured={state.configured}
          secondaryConfigured={state.secondaryConfigured}
          sll={
            state.mappings.find((item) => item.access === 'sll' && item.primary)?.productUcode ?? ''
          }
          store={
            state.mappings.find((item) => item.access === 'loja-pronta' && item.primary)
              ?.productUcode ?? ''
          }
        />
      </section>
      <section className={`${panelCard} mt-6 gap-4`} aria-labelledby="hotmart-history">
        <h2 id="hotmart-history" className="text-title font-semibold">
          Histórico de avisos
        </h2>
        <form
          method="get"
          action="/admin/hotmart#hotmart-history"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <FloatingLabelInput
              id="hotmart-history-search"
              name="historico"
              label="Produto, ID Hotmart ou transação"
              defaultValue={historyQuery}
              maxLength={200}
            />
          </div>
          <Button type="submit" size="inline" variant="soft" className="px-5">
            Buscar no histórico
          </Button>
        </form>
        {state.events.length ? (
          <ol className="divide-y divide-border">
            {state.events.map((event) => (
              <li className="py-3 text-body wrap-anywhere" key={event.id}>
                <h3 className="font-semibold">
                  {event.productName ?? 'Produto sem nome no aviso'}
                </h3>
                <p>
                  {Object.hasOwn(purchaseEventLabels, event.event)
                    ? purchaseEventLabels[event.event]
                    : 'Outro aviso da Hotmart'}
                </p>
                <p>{event.result}</p>
                <p className="text-muted-foreground">Transação {event.transaction}</p>
                <p className="text-muted-foreground">
                  Código do produto {event.productUcode}
                  {event.productId ? ` · ID ${event.productId}` : ''}
                </p>
                <span className="block text-muted-foreground">
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: 'America/Sao_Paulo',
                  }).format(event.receivedAt)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">
            {historyQuery ? 'Nenhum aviso encontrado para essa busca.' : 'Nenhum aviso recebido.'}
          </p>
        )}
      </section>
    </AdminPage>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, CircleAlertIcon, CircleHelpIcon, StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllStoreOverview } from '@/features/sll/server/store-overview';
import { requireProduct } from '@/features/products/server/access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Minhas Lojas · SLL' };

const badgeClass =
  'inline-flex w-fit rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground';

/** Mostra somente os registros da aluna e deixa a integração Shopee explícita enquanto ausente. */
export default async function SllStoresPage() {
  const { session, products } = await requireProduct('sll');
  const hasLojaPronta = products.includes('loja-pronta');
  const overview = await getSllStoreOverview(session.user.id, hasLojaPronta);
  const hasLoadFailure = overview.connected.status === 'failure';

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Minhas Lojas"
      intro="Veja o que já existe na sua conta e o que ainda está em preparação."
    >
      <section aria-labelledby="shopee-status-title" className={cn(panelCard, 'gap-5')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-link">
            <StoreIcon aria-hidden="true" className="size-6" />
          </span>
          <span className={badgeClass}>
            {hasLoadFailure ? 'Falha ao carregar' : 'Shopee · Em preparação'}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 id="shopee-status-title" className="text-body font-semibold text-foreground">
            {hasLoadFailure ? 'Não foi possível carregar suas lojas' : 'Conexão com a Shopee'}
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            {hasLoadFailure
              ? 'Tente novamente. Enquanto a leitura não terminar, não é possível confirmar se há montagem ou dados conectados.'
              : 'O SLL ainda não consulta lojas conectadas da Shopee. Por isso, não mostramos vendas, pedidos ou outras métricas nesta página.'}
          </p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted p-4">
            <dt className="text-sm text-muted-foreground">Lojas conectadas</dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {hasLoadFailure ? 'Não foi possível consultar' : 'Indisponível'}
            </dd>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <dt className="text-sm text-muted-foreground">Dados da Shopee</dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {hasLoadFailure ? 'Leitura interrompida' : 'Em preparação'}
            </dd>
          </div>
        </dl>
        <p
          className={cn(
            'flex gap-3 rounded-2xl px-4 py-3 text-body text-pretty',
            hasLoadFailure
              ? 'bg-destructive-soft text-destructive'
              : 'bg-primary-soft text-foreground',
          )}
          role={hasLoadFailure ? 'alert' : undefined}
        >
          {hasLoadFailure ? (
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          ) : (
            <CircleHelpIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
          )}
          <span>
            {hasLoadFailure
              ? 'A falha de leitura não significa que você não tenha uma loja. Atualize a página para tentar de novo.'
              : 'A ausência de consulta não significa zero vendas. Quando a integração estiver disponível, esta área poderá mostrar os dados autorizados da loja.'}
          </span>
        </p>
        {hasLoadFailure ? (
          <Button asChild className="w-full sm:w-fit" variant="soft">
            <Link href="/sll/minhas-lojas">Tentar novamente</Link>
          </Button>
        ) : (
          <Button asChild className="w-full sm:w-fit">
            <Link href="/sll/minhas-lojas/adicionar">
              Adicionar ou conectar loja <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        )}
      </section>

      {hasLoadFailure ? null : overview.assembly ? (
        <section aria-labelledby="assembly-title" className={cn(panelCard, 'gap-4')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted text-foreground">
                <StoreIcon aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Loja Pronta</p>
                <h2
                  id="assembly-title"
                  className="text-body font-semibold text-pretty break-words text-foreground"
                >
                  {overview.assembly.name}
                </h2>
              </div>
            </div>
            <span className={badgeClass}>Em montagem</span>
          </div>
          <p className="text-body text-pretty text-muted-foreground">
            Esta loja pertence ao processo da Loja Pronta. Ela não entra na contagem de lojas
            conectadas do SLL.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted p-4">
              <dt className="text-sm text-muted-foreground">Etapa atual</dt>
              <dd className="mt-1 text-body font-semibold text-foreground">
                {overview.assembly.phaseTitle}
              </dd>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <dt className="text-sm text-muted-foreground">Origem</dt>
              <dd className="mt-1 text-body font-semibold text-foreground">Loja Pronta</dd>
            </div>
          </dl>
          <Button asChild className="w-full sm:w-fit">
            <Link href="/loja-pronta">
              Continuar montagem <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </section>
      ) : (
        <section aria-labelledby="empty-stores-title" className={cn(panelCard, 'gap-3')}>
          <h2 id="empty-stores-title" className="text-body font-semibold text-foreground">
            Nenhuma loja em montagem
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            Ainda não há uma loja da Loja Pronta vinculada a esta conta.
          </p>
          {hasLojaPronta ? (
            <Button asChild className="mt-2 w-full sm:w-fit" variant="soft">
              <Link href="/loja-pronta">
                Começar na Loja Pronta <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </section>
      )}

      <section aria-labelledby="future-platforms-title" className={cn(panelCard, 'gap-4')}>
        <div className="flex flex-col gap-2">
          <h2 id="future-platforms-title" className="text-body font-semibold text-foreground">
            Outras plataformas
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            Estas integrações ainda não estão disponíveis no SLL.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {['TikTok Shop', 'Mercado Livre'].map((platform) => (
            <li key={platform} className="rounded-2xl bg-muted p-4">
              <p className="text-body font-semibold text-foreground">{platform}</p>
              <p className="mt-1 text-body text-muted-foreground">Em breve</p>
            </li>
          ))}
        </ul>
      </section>
    </SllAreaShell>
  );
}

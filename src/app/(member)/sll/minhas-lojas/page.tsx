import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckIcon,
  CircleAlertIcon,
  ShoppingBagIcon,
  StoreIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { panelCard, statusBadge } from '@/features/member/components/area-shell';
import { SllPage } from '@/features/sll/sll-area-shell';
import { getSllStoreSummary } from '@/features/sll/server/store-overview';
import type { SllStoreSummary } from '@/features/sll/store-overview';
import { requireProduct } from '@/features/products/server/access';
import {
  SllGroupTitle,
  SllGroupedList,
  SllListRow,
  SllRowIcon,
} from '@/features/sll/components/sll-grouped-list';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Minhas Lojas · SLL' };

/** Já com a Shopee escolhida: a escolha de plataforma ainda não tem outra opção funcionando. */
const CONNECT_PATH = '/sll/minhas-lojas/adicionar?plataforma=shopee';

type Step = {
  title: string;
  detail: ReactNode;
  href: string;
  state: 'now' | 'later' | 'done';
};

const STATE_LABEL: Record<Step['state'], string> = {
  now: 'Agora',
  later: 'Depois',
  done: 'Feito',
};

/** O que falta pra loja vender, na ordem: montar (quando tem a Loja Pronta) e conectar. */
function storeSteps(summary: SllStoreSummary, hasLojaPronta: boolean): Step[] {
  const steps: Step[] = [];
  if (summary.assembly) {
    steps.push({
      title: 'Terminar a montagem',
      detail: (
        <>
          Você está em: <span>{summary.assembly.phaseTitle}</span>
        </>
      ),
      href: '/loja-pronta',
      state: 'now',
    });
  }
  if (!summary.assembly && hasLojaPronta) {
    steps.push({
      title: 'Montar sua loja',
      detail: 'Nome, marca e produtos, passo a passo, na Loja Pronta.',
      href: '/loja-pronta',
      state: summary.connected ? 'later' : 'now',
    });
  }
  if (summary.connected) {
    steps.push({
      title: 'Loja conectada à Shopee',
      detail: 'Seus dados aparecem no seu plano.',
      href: '/sll/plano',
      state: 'done',
    });
    return steps;
  }
  steps.push({
    title: 'Conectar à Shopee',
    detail: 'Pra acompanhar pedidos e vendas por aqui.',
    href: CONNECT_PATH,
    state: steps.some((step) => step.state === 'now') ? 'later' : 'now',
  });
  return steps;
}

/** A ação principal é o primeiro passo que falta: um botão roxo só. */
function mainAction(summary: SllStoreSummary) {
  if (summary.assembly) return { href: '/loja-pronta', label: 'Continuar montagem' };
  if (summary.connected) return { href: '/sll/plano', label: 'Ver meu plano' };
  return { href: CONNECT_PATH, label: 'Conectar minha loja' };
}

/** A loja dela e o que falta pra vender. Montagem e conexão continuam como estados separados. */
export default async function SllStoresPage() {
  const { session, products } = await requireProduct('sll');
  const hasLojaPronta = products.includes('loja-pronta');
  const summary = await getSllStoreSummary(session.user, hasLojaPronta);

  return (
    <SllPage
      hasChoice={products.length > 1}
      title="Minhas Lojas"
      intro="Sua loja e o que falta pra ela vender."
    >
      {summary.failed ? (
        <StoreLoadFailure />
      ) : (
        <StoreCard summary={summary} hasLojaPronta={hasLojaPronta} />
      )}

      <section aria-labelledby="future-platforms-title" className="flex flex-col gap-3">
        <SllGroupTitle id="future-platforms-title">Outras plataformas</SllGroupTitle>
        <SllGroupedList>
          {['TikTok Shop', 'Mercado Livre'].map((platform) => (
            <SllListRow key={platform} icon={<StoreIcon />} title={platform} badge="Em breve" />
          ))}
        </SllGroupedList>
      </section>
    </SllPage>
  );
}

function StoreCard({
  summary,
  hasLojaPronta,
}: {
  summary: SllStoreSummary;
  hasLojaPronta: boolean;
}) {
  const steps = storeSteps(summary, hasLojaPronta);
  const action = mainAction(summary);

  return (
    <section aria-labelledby="store-title" className={cn(panelCard, 'gap-6')}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-shopee text-primary-foreground forced-colors:border forced-colors:border-[CanvasText]">
          <ShoppingBagIcon aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="store-title"
            className="text-headline font-semibold text-pretty break-words text-foreground"
          >
            {summary.assembly?.name ?? 'Sua loja na Shopee'}
          </h2>
          <p className="text-body text-muted-foreground">
            {summary.assembly ? 'Montada pela Loja Pronta' : 'Loja na Shopee'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.assembly ? <span className={statusBadge}>Em montagem</span> : null}
          <span className={statusBadge}>
            {summary.connected ? 'Shopee conectada' : 'Shopee não conectada'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-body font-semibold text-muted-foreground">O que falta</h3>
        <ol className="-mx-4 flex flex-col">
          {steps.map((step, index) => (
            <SllListRow
              key={step.title}
              href={step.href}
              icon={
                step.state === 'done' ? (
                  <CheckIcon />
                ) : (
                  <span className="text-body font-semibold tabular-nums">{index + 1}</span>
                )
              }
              iconTone={step.state === 'now' ? 'brand' : 'muted'}
              title={step.title}
              detail={step.detail}
              badge={STATE_LABEL[step.state]}
            />
          ))}
        </ol>
      </div>

      <Button asChild className="w-full sm:w-fit">
        <Link href={action.href}>
          {action.label} <ArrowRightIcon aria-hidden="true" />
        </Link>
      </Button>

      {summary.connected ? null : (
        <p className="text-sm text-pretty text-muted-foreground">
          Sem conexão, os números de vendas ficam vazios. Isso não quer dizer zero vendas.
          {hasLojaPronta ? ' A conexão vale pro SLL e pra Loja Pronta.' : ''}
        </p>
      )}
    </section>
  );
}

/** Falha de leitura não é "nenhuma loja": diz o que aconteceu e deixa tentar de novo. */
function StoreLoadFailure() {
  return (
    <section aria-labelledby="store-failure-title" className={cn(panelCard, 'gap-4')}>
      <div className="flex items-center gap-4">
        <SllRowIcon tone="muted">
          <StoreIcon />
        </SllRowIcon>
        <h2 id="store-failure-title" className="text-headline font-semibold text-foreground">
          Não foi possível carregar suas lojas
        </h2>
      </div>
      <Alert>
        <CircleAlertIcon aria-hidden="true" />
        <AlertDescription className="text-body">
          A falha de leitura não significa que você não tenha uma loja. Tente de novo.
        </AlertDescription>
      </Alert>
      <Button asChild className="w-full sm:w-fit" variant="soft">
        {/* Uma falha de leitura precisa de outra requisição, mesmo estando nesta página. */}
        {/* oxlint-disable-next-line next/no-html-link-for-pages */}
        <a href="/sll/minhas-lojas">Tentar novamente</a>
      </Button>
    </section>
  );
}

import { z } from 'zod';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleHelpIcon,
  ExternalLinkIcon,
  Link2Icon,
  PlusIcon,
  StoreIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllStoreOverview } from '@/features/sll/server/store-overview';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Adicionar ou conectar loja · SLL' };

const FLOW_PATH = '/sll/minhas-lojas/adicionar';
const SHOPEE_QUERY = `${FLOW_PATH}?plataforma=shopee`;
const cardTitleClass = 'text-xl font-semibold text-foreground';

/**
 * Entrada única para os dois caminhos de loja. A plataforma fica na URL para o retorno funcionar
 * sem depender de estado no navegador e para a escolha não ser perdida ao recarregar.
 */
export default async function AddStorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ session, products }, query] = await Promise.all([
    requireProduct('sll', FLOW_PATH),
    searchParams,
  ]);
  const platform = getParam(query.plataforma);
  const checkout = z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    })
    .safeParse(process.env.LOJA_PRONTA_CHECKOUT_URL);
  const hasLojaPronta = products.includes('loja-pronta');
  const overview =
    platform === 'shopee' && hasLojaPronta
      ? await getSllStoreOverview(session.user.id, true)
      : null;
  const hasLoadFailure = overview?.connected.status === 'failure';

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Adicionar ou conectar loja"
      intro={
        platform === 'shopee'
          ? 'Escolha o caminho que combina com o que você já tem.'
          : 'Primeiro, escolha a plataforma da sua loja.'
      }
      backLink={{ href: '/sll/minhas-lojas', label: 'Minhas Lojas' }}
      currentSection={FLOW_PATH}
    >
      {platform === 'shopee' ? (
        <StorePathStep
          hasLojaPronta={hasLojaPronta}
          checkoutUrl={checkout.success ? checkout.data : null}
          assembly={overview?.assembly ?? null}
          hasLoadFailure={hasLoadFailure}
        />
      ) : (
        <PlatformStep />
      )}
    </SllAreaShell>
  );
}

function PlatformStep() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="platform-choice-title" className={cn(panelCard, 'gap-5')}>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wide text-progress-text uppercase">
            Passo 1 de 2
          </p>
          <h2 id="platform-choice-title" className={cardTitleClass}>
            Onde está sua loja?
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            Por enquanto, a Loja Pronta Prime trabalha com a Shopee. Escolha essa opção para ver os
            caminhos disponíveis.
          </p>
        </div>
        <ul className="grid gap-3">
          <li>
            <Link
              href={SHOPEE_QUERY}
              className="group flex min-h-20 items-center gap-4 rounded-2xl border border-primary bg-primary-soft p-4 text-foreground transition-[background-color,transform] duration-100 outline-none hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 forced-colors:border-[Highlight]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-link shadow-card">
                <StoreIcon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">Shopee</span>
                <span className="block text-sm text-muted-foreground">
                  A plataforma confirmada para esta jornada.
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-link motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </Link>
          </li>
          <li className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-muted p-4 forced-colors:border-[CanvasText]">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-muted-foreground">
              <PlusIcon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-foreground">TikTok Shop</span>
              <span className="block text-sm text-muted-foreground">Em breve</span>
            </span>
          </li>
          <li className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-muted p-4 forced-colors:border-[CanvasText]">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-muted-foreground">
              <PlusIcon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-foreground">Mercado Livre</span>
              <span className="block text-sm text-muted-foreground">Em breve</span>
            </span>
          </li>
        </ul>
      </section>
      <p className="flex gap-3 px-2 text-sm text-muted-foreground">
        <CircleHelpIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
        <span>Você pode voltar para Minhas Lojas sem perder esta escolha.</span>
      </p>
    </div>
  );
}

function StorePathStep({
  hasLojaPronta,
  checkoutUrl,
  assembly,
  hasLoadFailure,
}: {
  hasLojaPronta: boolean;
  checkoutUrl: string | null;
  assembly: { name: string; phaseTitle: string } | null;
  hasLoadFailure: boolean | undefined;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="path-choice-title" className={cn(panelCard, 'gap-5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-link">
              <StoreIcon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Plataforma escolhida</p>
              <p className="text-body font-semibold text-foreground">Shopee</p>
            </div>
          </div>
          <Link
            href={FLOW_PATH}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-link outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Trocar plataforma
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wide text-progress-text uppercase">
            Passo 2 de 2
          </p>
          <h2 id="path-choice-title" className={cardTitleClass}>
            O que você quer fazer?
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            Conectar usa uma conta que você já tem. Começar montagem leva para a jornada automática
            da Loja Pronta, feita por você passo a passo.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section aria-labelledby="connect-title" className={cn(panelCard, 'gap-4')}>
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-foreground">
              <Link2Icon aria-hidden="true" className="size-6" />
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
              Acesso pelo SLL
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 id="connect-title" className={cardTitleClass}>
              Conectar uma loja existente
            </h2>
            <p className="text-body text-pretty text-muted-foreground">
              Vincula uma conta da Shopee para usar os recursos reais do SLL, como os dados da sua
              operação.
            </p>
          </div>
          <p className="flex gap-3 rounded-2xl bg-muted px-4 py-3 text-sm text-pretty text-muted-foreground">
            <ExternalLinkIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <span>
              Você confere a disponibilidade da conexão na próxima tela e autoriza o acesso no site
              da Shopee. A loja só aparece conectada depois dessa confirmação.
            </span>
          </p>
          <Button asChild>
            <Link href="/sll/minhas-lojas/conectar">Cadastrar ou conectar minha loja</Link>
          </Button>
        </section>

        <section aria-labelledby="assembly-title" className={cn(panelCard, 'gap-4')}>
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-link">
              {assembly ? (
                <CheckCircle2Icon aria-hidden="true" className="size-6" />
              ) : (
                <PlusIcon aria-hidden="true" className="size-6" />
              )}
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
              {hasLoadFailure
                ? 'Verificação indisponível'
                : assembly
                  ? 'Em andamento'
                  : 'Disponível com Loja Pronta'}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 id="assembly-title" className={cardTitleClass}>
              {hasLoadFailure
                ? 'Confira o estado da montagem'
                : assembly
                  ? 'Continuar a montagem'
                  : 'Começar a montagem'}
            </h2>
            <p className="text-body text-pretty text-muted-foreground">
              {hasLoadFailure
                ? 'Não foi possível verificar se já existe uma montagem nesta conta. Tente novamente antes de começar.'
                : assembly
                  ? `Sua loja ${assembly.name} está em ${assembly.phaseTitle}. A Loja Pronta guarda onde você parou.`
                  : 'Você monta sua loja na Shopee com nome, marca e próximos passos guiados.'}
            </p>
          </div>
          {hasLoadFailure ? (
            <Button asChild className="w-full" variant="soft">
              <Link href={SHOPEE_QUERY}>Tentar novamente</Link>
            </Button>
          ) : hasLojaPronta ? (
            <Button asChild className="w-full">
              <Link href="/loja-pronta">
                {assembly ? 'Continuar montagem' : 'Começar na Loja Pronta'}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          ) : checkoutUrl ? (
            <>
              <p className="text-body text-muted-foreground">
                A Loja Pronta é uma compra adicional. Seu acesso ao SLL e a conexão da Shopee
                continuam independentes.
              </p>
              <Button asChild>
                <a href={checkoutUrl} target="_blank" rel="noreferrer">
                  Conhecer a Loja Pronta<span className="sr-only"> (abre em outra aba)</span>
                </a>
              </Button>
            </>
          ) : (
            <p className="flex gap-3 rounded-2xl bg-muted px-4 py-3 text-sm text-pretty text-muted-foreground">
              <CircleHelpIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span>
                Seu acesso atual inclui o SLL, mas não a Loja Pronta. A montagem não foi liberada
                para esta conta.
              </span>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

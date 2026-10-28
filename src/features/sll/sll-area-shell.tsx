import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import { BrandLink } from '@/components/brand/site-navbar';
import { Button } from '@/components/ui/button';
import { AccountMenu } from '@/features/member/components/account-menu';
import { MemberNavbar, type NavbarAccount } from '@/features/member/components/member-navbar';
import { PRODUCTS } from '@/features/products/catalog';
import { ThemeToggleButton } from '@/features/theme/theme-toggle-button';
import { SllSidebar } from './sll-sidebar';
import { NavigationPending } from '@/components/ui/navigation-pending';
import { PageLoading } from '@/components/ui/page-loading';
import { PageMain } from '@/components/ui/page-main';
import { ScrollFade } from '@/components/ui/scroll-fade';

type SllPageProps = {
  /** Tem os dois produtos: o nome do produto some de cima do título. */
  hasChoice: boolean;
  /** Nome do produto, em cima do título, pra quem só tem o SLL. */
  product?: string | undefined;
  title: string;
  intro?: string | undefined;
  /** Destaque antes do título (o banner do painel). */
  beforeHeader?: ReactNode;
  /** O caminho de volta, antes do título (etapas, cursos e aulas). */
  backLink?: { href: string; label: string } | undefined;
  children: ReactNode;
};

/**
 * O cabeçalho e o conteúdo de uma página do SLL. A moldura (`SllAreaFrame`) fica no
 * `layout.tsx` da área e não se refaz ao trocar de página: só isto muda.
 */
export function SllPage({
  hasChoice,
  product,
  title,
  intro,
  beforeHeader,
  backLink,
  children,
}: SllPageProps) {
  return (
    <>
      {beforeHeader}
      <div className="flex flex-col gap-2">
        {backLink ? (
          <Button
            asChild
            className="-ml-2 w-fit px-2 text-sm whitespace-normal"
            size="inline"
            variant="ghost"
          >
            <Link href={backLink.href}>
              <ArrowLeft aria-hidden="true" />
              {backLink.label}
            </Link>
          </Button>
        ) : null}
        {!hasChoice && product ? (
          <p className="text-body font-medium text-muted-foreground">{product}</p>
        ) : null}
        <h1 className="text-title font-semibold text-balance sm:text-title-lg">{title}</h1>
        {intro ? (
          <p className="max-w-[60ch] text-body text-pretty text-muted-foreground">{intro}</p>
        ) : null}
      </div>
      {children}
    </>
  );
}

type SllAreaFrameProps = {
  /** Quem está logada (o pé do menu lateral, ou a barra do topo no celular). */
  account: NavbarAccount;
  /** Tem os dois produtos: o menu oferece ir pra Minha loja. */
  hasChoice: boolean;
  navigation?: { rail: ReactNode; disclosure: ReactNode; label: string };
  courseArea?: { href: string; label: string };
  children: ReactNode;
};

/**
 * Moldura do SLL, separada da Loja Pronta: um painel (dashboard). No computador, o menu lateral
 * fica fixo na altura da tela, de ponta a ponta, com a marca e o tema no topo, as seções no meio
 * (rolam sozinhas, se forem muitas) e, no pé, a troca de área e a conta. Não tem barra no topo:
 * o conteúdo começa no alto, à direita. No celular, volta a barra do topo (com as abas das
 * áreas) e as seções abrem pelo controle "Seções do SLL", acima do título. Mora no `layout.tsx`:
 * ao trocar de página, o menu fica parado e só o conteúdo muda (com o esboço de carregamento
 * enquanto a página nova não chega).
 */
export function SllAreaFrame({
  account,
  hasChoice,
  navigation,
  courseArea,
  children,
}: SllAreaFrameProps) {
  const accountName = account.preferredName?.trim() || account.name;

  return (
    <>
      <nav aria-label="Atalho para o conteúdo">
        <a
          href="#sll-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-6 focus:py-3 focus:text-body focus:text-link focus:shadow-card focus:outline-2 focus:outline-ring"
        >
          Pular para o conteúdo
        </a>
      </nav>
      <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          aria-label={navigation?.label ?? 'Navegação do SLL'}
          className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6 lg:border-r lg:border-border lg:bg-card lg:px-4 lg:pt-5 lg:pb-4 forced-colors:border-[CanvasText]"
        >
          <div className="flex items-center justify-between gap-2">
            <BrandLink className="ml-1" />
            <ThemeToggleButton />
          </div>
          <ScrollFade className="-mx-1 min-h-0 flex-1 px-1">
            {navigation?.rail ?? <SllSidebar variant="rail" />}
          </ScrollFade>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {hasChoice ? (
              <nav aria-label="Suas áreas">
                <Link
                  href={PRODUCTS['loja-pronta'].path}
                  className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150"
                >
                  <Store aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                  Ir pra {PRODUCTS['loja-pronta'].tab}
                </Link>
              </nav>
            ) : null}
            <AccountMenu
              variant="sidebar"
              name={accountName}
              email={account.email}
              image={account.image}
            />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <div className="lg:hidden">
            <MemberNavbar
              account={account}
              currentArea={hasChoice ? 'sll' : undefined}
              courseArea={courseArea}
            />
          </div>
          <PageMain
            id="sll-content"
            tabIndex={-1}
            className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pt-6 pb-12 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6 sm:pt-8 lg:px-10 lg:pt-10"
          >
            <div className="lg:hidden">
              {navigation?.disclosure ?? <SllSidebar variant="disclosure" />}
            </div>
            <NavigationPending fallback={<PageLoading />}>{children}</NavigationPending>
          </PageMain>
        </div>
      </div>
    </>
  );
}

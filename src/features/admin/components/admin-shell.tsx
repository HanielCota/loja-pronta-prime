import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLink } from '@/components/brand/site-navbar';
import { Button } from '@/components/ui/button';
import { AccountMenu } from '@/features/member/components/account-menu';
import { MemberNavbar, type NavbarAccount } from '@/features/member/components/member-navbar';
import { ThemeToggleButton } from '@/features/theme/theme-toggle-button';
import { AdminSidebar, type AdminMenuAccess } from './admin-sidebar';
import { StudentAreaLink } from './student-area-link';
import { NavigationPending } from '@/components/ui/navigation-pending';
import { PageLoading } from '@/components/ui/page-loading';
import { PageMain } from '@/components/ui/page-main';
import { ScrollFade } from '@/components/ui/scroll-fade';

type AdminPageProps = {
  title: string;
  intro?: string | undefined;
  /** O caminho de volta, antes do título (a tela de uma conta). */
  backLink?: { href: string; label: string } | undefined;
  /** Ação ao lado do título, no computador (embaixo dele no celular). */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * O cabeçalho e o conteúdo de uma página do painel. A moldura (`AdminFrame`) fica no
 * `layout.tsx` e não se refaz ao trocar de seção: só isto muda.
 */
export function AdminPage({ title, intro, backLink, actions, children }: AdminPageProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
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
          <h1 className="text-title font-semibold text-balance break-words sm:text-title-lg">
            {title}
          </h1>
          {intro ? (
            <p className="max-w-[60ch] text-body text-pretty break-words text-muted-foreground">
              {intro}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
      </div>
      {children}
    </>
  );
}

type AdminFrameProps = {
  account: NavbarAccount;
  /** O que a conta vê no menu (o cargo na equipe). */
  access: AdminMenuAccess;
  children: ReactNode;
};

/**
 * Moldura do admin: um painel (dashboard), como o SLL. No computador, sem barra no topo: o menu
 * lateral fica fixo na altura da tela, com a marca e o tema no alto, as seções no meio (rolam
 * sozinhas, se não couberem) e a conta no pé. O conteúdo ocupa o resto da largura. No celular,
 * volta a barra do topo e as seções abrem pelo controle "Seções do painel", acima do título.
 * Mora no `layout.tsx`: ao trocar de seção, o menu fica parado e só o conteúdo muda (com o
 * esboço de carregamento enquanto a página nova não chega). A seção marcada no menu sai do endereço (`AdminSidebar`).
 */
export function AdminFrame({ account, access, children }: AdminFrameProps) {
  const accountName = account.preferredName?.trim() || account.name;

  return (
    <>
      <nav aria-label="Atalho para o conteúdo">
        <a
          href="#admin-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-6 focus:py-3 focus:text-body focus:text-link focus:shadow-card focus:outline-2 focus:outline-ring"
        >
          Pular para o conteúdo
        </a>
      </nav>
      <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          aria-label="Navegação da administração"
          className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6 lg:border-r lg:border-border lg:bg-card lg:px-4 lg:pt-5 lg:pb-4 forced-colors:border-[CanvasText]"
        >
          <div className="flex items-center justify-between gap-2">
            <BrandLink className="ml-1" />
            <ThemeToggleButton />
          </div>
          <ScrollFade className="-mx-1 min-h-0 flex-1 px-1">
            <AdminSidebar variant="rail" access={access} />
          </ScrollFade>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <StudentAreaLink />
            <AccountMenu
              styledEmailTooltip
              variant="sidebar"
              name={accountName}
              email={account.email}
              image={account.image}
            />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <div className="lg:hidden">
            <MemberNavbar account={account} />
          </div>
          <PageMain
            id="admin-content"
            tabIndex={-1}
            className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 pt-6 pb-12 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6 sm:pt-8 lg:px-10 lg:pt-10"
          >
            <div className="lg:hidden">
              <AdminSidebar variant="disclosure" access={access} />
            </div>
            <NavigationPending fallback={<PageLoading />}>{children}</NavigationPending>
          </PageMain>
        </div>
      </div>
    </>
  );
}

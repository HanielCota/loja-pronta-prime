import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import { BrandLink } from '@/components/brand/site-navbar';
import { Button } from '@/components/ui/button';
import { AccountMenu } from '@/features/member/components/account-menu';
import { MemberNavbar, type NavbarAccount } from '@/features/member/components/member-navbar';
import { ThemeToggleButton } from '@/features/theme/theme-toggle-button';
import { AdminSidebar, type AdminSection } from './admin-sidebar';
import { PageMain } from '@/components/ui/page-main';

type AdminShellProps = {
  account: NavbarAccount;
  /** A seção do menu marcada como atual (a prévia da aula não tem uma). */
  current?: AdminSection | undefined;
  title: string;
  intro?: string | undefined;
  /** O caminho de volta, antes do título (a tela de uma conta). */
  backLink?: { href: string; label: string } | undefined;
  /** Ação ao lado do título, no computador (embaixo dele no celular). */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Moldura do admin: um painel (dashboard), como o SLL. No computador, sem barra no topo: o menu
 * lateral fica fixo na altura da tela, com a marca e o tema no alto, as seções no meio (rolam
 * sozinhas, se não couberem) e a conta no pé. O conteúdo ocupa o resto da largura. No celular,
 * volta a barra do topo e as seções abrem pelo controle "Seções do painel", acima do título.
 */
export function AdminShell({
  account,
  current,
  title,
  intro,
  backLink,
  actions,
  children,
}: AdminShellProps) {
  const accountName = account.preferredName?.trim() || account.name;

  return (
    <>
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-6 focus:py-3 focus:text-body focus:text-link focus:shadow-card focus:outline-2 focus:outline-ring"
      >
        Pular para o conteúdo
      </a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          aria-label="Navegação da administração"
          className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6 lg:border-r lg:border-border lg:bg-card lg:px-4 lg:pt-5 lg:pb-4 forced-colors:border-[CanvasText]"
        >
          <div className="flex items-center justify-between gap-2">
            <BrandLink className="ml-1" />
            <ThemeToggleButton />
          </div>
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            <AdminSidebar current={current} variant="rail" />
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {/* A volta pra área das alunas, já que o painel não tem a barra do topo. */}
            <Link
              href="/"
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150"
            >
              <Eye aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              Ver a área das alunas
            </Link>
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
            <MemberNavbar account={account} />
          </div>
          <PageMain
            id="admin-content"
            tabIndex={-1}
            className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 pt-6 pb-12 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6 sm:pt-8 lg:px-10 lg:pt-10"
          >
            <div className="lg:hidden">
              <AdminSidebar current={current} variant="disclosure" />
            </div>
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
          </PageMain>
        </div>
      </div>
    </>
  );
}

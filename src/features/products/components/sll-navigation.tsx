'use client';

import type { LucideIcon } from 'lucide-react';
import {
  CalculatorIcon,
  ChevronRightIcon,
  CompassIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  MenuIcon,
  PlusIcon,
  RouteIcon,
  StoreIcon,
  XIcon,
  WorkflowIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sllCurrentStage, type SllStage, type SllStageLink } from '../sll-navigation';

const LINK_CLASS =
  'flex min-h-11 min-w-0 items-center gap-3 rounded-full px-3 text-body font-medium text-foreground outline-none transition-[background-color,color] duration-100 ease-out hover:bg-muted active:bg-primary-soft active:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none';

/**
 * No computador, a navegação fica ao lado do conteúdo. No celular, a mesma lista abre numa gaveta
 * acessível pela esquerda, com foco preso e fechamento pelo Escape ou pelo botão.
 */
export function SllNavigation({
  mobile = false,
  stageLinks = [],
  currentSection,
}: {
  mobile?: boolean;
  stageLinks?: SllStageLink[] | undefined;
  /** Seção de origem de uma aula, para marcar a etapa certa no menu. */
  currentSection?: string | undefined;
}) {
  const pathname = usePathname();
  const currentStage = sllCurrentStage(pathname, currentSection, stageLinks);

  if (mobile) {
    return (
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Abrir navegação do SLL"
            className="lg:hidden"
          >
            <MenuIcon aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:data-[state=open]:animate-none" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-5 overflow-y-auto overscroll-contain rounded-r-card bg-background p-4 shadow-card outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left motion-reduce:data-[state=open]:animate-none forced-colors:border-r forced-colors:border-[CanvasText]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <Dialog.Title className="text-body font-semibold text-foreground">
                  Navegação do SLL
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  Escolha uma área.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Fechar menu">
                  <XIcon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </Button>
              </Dialog.Close>
            </div>
            <NavigationList
              pathname={pathname}
              currentStage={currentStage}
              stageLinks={stageLinks}
              mobile
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <aside className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] min-w-0 flex-col gap-5 overflow-y-auto rounded-card bg-card p-4 shadow-card lg:flex forced-colors:border forced-colors:border-[CanvasText]">
      <NavigationList pathname={pathname} currentStage={currentStage} stageLinks={stageLinks} />
    </aside>
  );
}

function NavigationList({
  pathname,
  currentStage,
  stageLinks,
  mobile = false,
}: {
  pathname: string;
  currentStage: SllStage | null;
  stageLinks: SllStageLink[];
  mobile?: boolean;
}) {
  const storeStatusTitleId = mobile
    ? 'sll-mobile-store-status-title'
    : 'sll-desktop-store-status-title';

  return (
    <nav aria-label="Navegação do SLL" className="flex flex-col gap-5">
      <NavGroup title="Minha operação">
        <NavLink
          href="/sll"
          label="Painel"
          active={pathname === '/sll'}
          current={pathname === '/sll'}
          mobile={mobile}
          icon={LayoutDashboardIcon}
        />
        <NavLink
          href="/sll/minhas-lojas"
          label="Minhas Lojas"
          active={pathname === '/sll/minhas-lojas'}
          current={pathname === '/sll/minhas-lojas'}
          mobile={mobile}
          icon={StoreIcon}
        />
        <NavLink
          href="/sll/minhas-lojas/adicionar"
          label="Adicionar ou conectar loja"
          active={pathname === '/sll/minhas-lojas/adicionar'}
          current={pathname === '/sll/minhas-lojas/adicionar'}
          mobile={mobile}
          icon={PlusIcon}
        />
      </NavGroup>

      <NavGroup title="Aprender">
        <NavLink
          href="/sll/comece-aqui"
          label="Comece aqui"
          active={pathname.startsWith('/sll/comece-aqui')}
          current={pathname.startsWith('/sll/comece-aqui')}
          mobile={mobile}
          icon={CompassIcon}
        />
        <NavLink
          href="/sll/metodo"
          label="SLL — Sistema Loja Lucrativa"
          active={pathname === '/sll/metodo' || pathname.startsWith('/sll/metodo/')}
          current={pathname === '/sll/metodo'}
          mobile={mobile}
          icon={RouteIcon}
        >
          {stageLinks.length ? (
            <ol className="ml-5 flex flex-col gap-2 pl-2">
              {stageLinks.map(({ stage, href, label }) => (
                <NavLink
                  key={stage}
                  href={href}
                  label={label}
                  active={currentStage === stage}
                  current={currentStage === stage}
                  currentType="step"
                  mobile={mobile}
                  stage={stage}
                />
              ))}
            </ol>
          ) : null}
        </NavLink>
        <NavLink
          href="/sll/recursos"
          label="Ferramentas Automáticas"
          active={pathname.startsWith('/sll/recursos')}
          current={pathname.startsWith('/sll/recursos')}
          mobile={mobile}
          icon={WorkflowIcon}
        />
        <NavLink
          href="/sll/cursos"
          label="Cursos Complementares"
          active={pathname.startsWith('/sll/cursos')}
          current={pathname.startsWith('/sll/cursos')}
          mobile={mobile}
          icon={LibraryBigIcon}
        />
      </NavGroup>

      <ul className="flex list-none flex-col gap-1 border-t border-border pt-4">
        <NavLink
          href="/sll/recursos#calculadora"
          label="Calculadora de preço"
          active={false}
          mobile={mobile}
          icon={CalculatorIcon}
        />
      </ul>

      <section
        aria-labelledby={storeStatusTitleId}
        className="flex flex-col gap-2 rounded-2xl bg-muted p-3"
      >
        <h2 id={storeStatusTitleId} className="text-sm font-semibold text-foreground">
          Lojas conectadas
        </h2>
        <p className="text-sm text-muted-foreground">
          A conexão com a Shopee ainda está em preparação.
        </p>
      </section>
    </nav>
  );
}

function NavGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="px-3 text-sm font-semibold text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function NavLink({
  href,
  label,
  active,
  current = false,
  currentType = 'page',
  mobile,
  icon: Icon,
  stage,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  current?: boolean;
  currentType?: 'page' | 'step';
  mobile?: boolean;
  icon?: LucideIcon;
  stage?: SllStage;
  children?: ReactNode;
}) {
  const link = (
    <Link
      href={href}
      aria-current={current ? currentType : undefined}
      className={cn(
        LINK_CLASS,
        active && 'bg-muted font-semibold text-foreground hover:bg-muted',
        active && 'forced-colors:border forced-colors:border-[Highlight]',
        stage && 'gap-2 pl-2',
      )}
    >
      {stage ? (
        <span
          aria-hidden="true"
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full bg-segment text-sm font-semibold text-foreground',
            active && 'bg-primary text-primary-foreground',
          )}
        >
          {stage}
        </span>
      ) : Icon ? (
        <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
      ) : null}
      <span className="min-w-0 flex-1 text-pretty">{label}</span>
      {active && !current && !stage ? (
        <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      ) : null}
    </Link>
  );

  return (
    <li>
      {mobile ? <Dialog.Close asChild>{link}</Dialog.Close> : link}
      {children}
    </li>
  );
}

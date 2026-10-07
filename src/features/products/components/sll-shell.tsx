import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { AreaSwitcher } from '@/features/member/components/area-switcher';
import { MemberNavbar, type NavbarAccount } from '@/features/member/components/member-navbar';
import { panelCard } from '@/features/member/components/area-shell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SllPage, SllStageLink } from '../sll-navigation';
import { SllNavigation } from './sll-navigation';

/** Moldura do SLL: navegação lateral da referência, com o cabeçalho e os componentes da Prime. */
export function SllShell({
  account,
  hasChoice,
  title,
  description,
  children,
  beforeHeader,
  stageLinks = [],
  currentSection,
  productName = 'Sistema Loja Lucrativa (SLL)',
  backLink,
  header,
}: {
  account: NavbarAccount;
  hasChoice: boolean;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  /** Conteúdo de destaque do painel, que aparece antes da saudação. */
  beforeHeader?: ReactNode | undefined;
  stageLinks?: SllStageLink[] | undefined;
  currentSection?: string | undefined;
  productName?: string | undefined;
  backLink?: { href: string; label: string } | undefined;
  header?: ReactNode | undefined;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#sll-content"
        className="sr-only z-50 rounded-full bg-card px-4 py-3 text-body font-semibold text-link focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-ring focus:outline-solid"
      >
        Pular para o conteúdo
      </a>
      <MemberNavbar account={account} wide>
        <SllNavigation mobile stageLinks={stageLinks} currentSection={currentSection} />
      </MemberNavbar>
      <main
        id="sll-content"
        tabIndex={-1}
        className="grid w-full flex-1 grid-cols-1 items-start gap-6 px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-x-[clamp(3rem,10vw,12.5rem)] lg:px-8"
      >
        <SllNavigation stageLinks={stageLinks} currentSection={currentSection} />
        <div className="flex max-w-[1040px] min-w-0 flex-col gap-8">
          {hasChoice ? <AreaSwitcher current="sll" /> : null}
          {beforeHeader}
          <header className="flex flex-col gap-2">
            {backLink ? (
              <Button
                asChild
                className="-ml-2 w-fit px-2 text-sm whitespace-normal"
                size="inline"
                variant="ghost"
              >
                <Link href={backLink.href}>
                  <ArrowLeftIcon aria-hidden="true" />
                  {backLink.label}
                </Link>
              </Button>
            ) : null}
            {!hasChoice ? (
              <p className="text-body font-medium text-muted-foreground">{productName}</p>
            ) : null}
            {header ?? (
              <>
                <h1 className="text-title font-semibold text-balance sm:text-title-lg">{title}</h1>
                {description ? (
                  <p className="max-w-[60ch] text-body text-pretty text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </>
            )}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Estado claro enquanto a área existe na navegação, mas o conteúdo real não foi integrado. */
export function SllUnavailablePage({
  account,
  hasChoice,
  page,
  stageLinks,
}: {
  account: NavbarAccount;
  hasChoice: boolean;
  page: SllPage;
  stageLinks: SllStageLink[];
}) {
  const isStores = page.availability === 'stores';
  const isCalculator = page.availability === 'calculator';
  const cardTitle = isStores
    ? 'Lojas conectadas'
    : isCalculator
      ? 'Calculadora de preço da Shopee'
      : 'Conteúdo em preparação';
  const cardCopy = isStores
    ? 'A conexão com a Shopee, a contagem de lojas e o cadastro de novas lojas ainda não estão disponíveis nesta área.'
    : isCalculator
      ? 'A calculadora ainda não está disponível. As taxas e os custos precisam ser confirmados antes de calcular preços.'
      : 'As aulas e os materiais desta área ainda não foram cadastrados nesta versão da Prime.';

  return (
    <SllShell
      account={account}
      hasChoice={hasChoice}
      title={page.title}
      description={page.description}
      stageLinks={stageLinks}
    >
      <section
        id={isCalculator ? 'calculadora' : undefined}
        aria-labelledby="sll-unavailable-title"
        className={cn(panelCard, 'scroll-mt-6 gap-2')}
      >
        <h2 id="sll-unavailable-title" className="text-body font-semibold text-foreground">
          {cardTitle}
        </h2>
        <p className="text-body text-pretty text-muted-foreground">{cardCopy}</p>
        <p className="text-sm font-medium text-muted-foreground">Em preparação</p>
      </section>
    </SllShell>
  );
}

import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Mascot } from '@/components/brand/mascot';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { cn } from '@/lib/utils';

/** Cartão branco das áreas; no alto contraste, a borda desenha o que a sombra desenhava. */
export const panelCard =
  'flex flex-col rounded-card bg-card p-6 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]';
/** Rótulo pequeno em maiúsculas ("LOJA PRONTA", "SUA JORNADA"), igual em todas as telas. */
export const eyebrowClass = 'text-sm font-semibold tracking-wide text-muted-foreground uppercase';

/**
 * Saudação das áreas, a mesma em todas: "Boas-vindas, Ana!" na primeira visita, seguida do que a
 * página mostra. Depois, só o que a página mostra: ela já foi cumprimentada na escolha de área.
 */
export function greeting(name: string, firstVisit: boolean, rest: string): string {
  if (!firstVisit) return rest;
  return `Boas-vindas${name ? `, ${name}` : ''}! ${rest}`;
}

type AreaShellProps = {
  /** Tem os dois produtos: o topo leva de volta pra escolha. */
  hasChoice: boolean;
  /** Nome do produto, em cima do título. */
  eyebrow: string;
  /** Onde ela está no produto ("Sua loja está na fase 1 de 7"). */
  title: string;
  /** A saudação e o que a página mostra. */
  intro: string;
  children: ReactNode;
};

/**
 * Moldura das áreas dos produtos (Loja Pronta e SLL), igual nas duas: no topo, voltar pra
 * escolha (com os dois produtos) e sair; o mascote com o nome do produto e onde ela está; e o
 * conteúdo da área. Sem cartão em volta, como a escolha de área.
 */
export function AreaShell({ hasChoice, eyebrow, title, intro, children }: AreaShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1040px] flex-col gap-8 px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <TopBar back={hasChoice ? { href: '/', label: 'Início' } : undefined} />
      <main className="flex flex-col gap-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <Mascot expression="happy" displaySize={96} className="size-20 shrink-0 sm:size-24" />
          <div className="flex flex-1 flex-col gap-2">
            <p className={eyebrowClass}>{eyebrow}</p>
            <h1 className="text-title font-semibold text-balance sm:text-title-lg">{title}</h1>
            <p className="text-body text-pretty text-muted-foreground">{intro}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

/**
 * Topo das telas de dentro (região própria): voltar à esquerda, quando houver pra onde, e sair à
 * direita. O mesmo lugar em todas as telas da aluna.
 */
export function TopBar({ back }: { back?: { href: string; label: string } }) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-4">
      {back ? (
        <Link
          href={back.href}
          className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md font-medium text-muted-foreground transition-colors duration-100 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
          {back.label}
        </Link>
      ) : (
        <span />
      )}
      <SignOutButton />
    </header>
  );
}

/**
 * Telas de dentro com o conteúdo no meio (a escolha de área, o aviso de acesso não liberado): o
 * mesmo topo das áreas, e o conteúdo centralizado no espaço que sobra.
 */
export function CenteredMemberPage({
  children,
  wide,
  back,
}: {
  children: ReactNode;
  wide?: boolean;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1040px] flex-col px-4 pt-4 sm:px-6 sm:pt-6">
      <TopBar back={back} />
      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col justify-center gap-6 py-8 sm:py-12',
          wide ? 'max-w-[880px]' : 'max-w-[480px] lg:max-w-[640px]',
        )}
      >
        {children}
      </main>
    </div>
  );
}

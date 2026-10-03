import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { cn } from '@/lib/utils';

/** Cartão branco das áreas; no alto contraste, a borda desenha o que a sombra desenhava. */
export const panelCard =
  'flex flex-col rounded-card bg-card p-6 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]';
/** Título de seção dentro de um cartão ("Ferramentas", "Seu caminho no curso"). */
export const sectionTitleClass = 'text-body font-semibold text-foreground';

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
  /** Nome do produto, em cima do título (sem ele, o título fala sozinho). */
  product?: string | undefined;
  /** O assunto da área (o nome da loja, "As aulas abrem em breve"). */
  title: string;
  /** A saudação e o que a página mostra (opcional). */
  intro?: string | undefined;
  children: ReactNode;
};

/**
 * Moldura das áreas dos produtos (Loja Pronta e SLL): voltar no topo, o nome do produto e onde ela
 * está, o conteúdo e, no fim, o sair.
 */
export function AreaShell({ hasChoice, product, title, intro, children }: AreaShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1040px] flex-col gap-8 px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <TopBar back={hasChoice ? { href: '/', label: 'Voltar ao início' } : undefined} />
      <main className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          {product ? (
            <p className="text-body font-medium text-muted-foreground">{product}</p>
          ) : null}
          <h1 className="text-title font-semibold text-balance sm:text-title-lg">{title}</h1>
          {intro ? (
            <p className="max-w-[60ch] text-body text-pretty text-muted-foreground">{intro}</p>
          ) : null}
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * Topo das telas de dentro (região própria): voltar, quando houver pra onde. Sem ele, não há topo:
 * o sair fica no rodapé, longe da ação principal da tela.
 */
function TopBar({ back }: { back?: { href: string; label: string } | undefined }) {
  if (!back) return null;
  return (
    <header className="flex min-h-11 items-center">
      {/* Sutil, mas com cara de botão: a seta azul num círculo branco é o que chama o olho, e o
          texto escuro diz o que faz. Sem moldura em volta de tudo, não disputa com o título. A área
          de toque (44px) pega o texto e o círculo juntos. */}
      <Link
        href={back.href}
        className="group -ml-1 inline-flex min-h-11 items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <span className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors duration-150 group-hover:border-primary/30 group-hover:bg-primary-soft group-active:scale-95 motion-safe:transition-[color,background-color,border-color,transform] forced-colors:border-[ButtonText]">
          <ChevronLeftIcon
            aria-hidden="true"
            className="size-5 transition-transform duration-150 motion-safe:group-hover:-translate-x-0.5"
          />
        </span>
        <span className="underline-offset-4 group-hover:underline">{back.label}</span>
      </Link>
    </header>
  );
}

/**
 * Rodapé das telas de dentro: o sair, em cinza, depois de todo o conteúdo. Sair é raro e, tocado
 * sem querer, custa digitar a senha de novo: aqui ele não disputa atenção com o que ela veio fazer.
 * Nas telas curtas, fica no pé da tela; nas longas, no fim da página.
 */
function Footer() {
  return (
    <footer className="mt-auto flex justify-center pt-4">
      <SignOutButton />
    </footer>
  );
}

/**
 * Telas de dentro com o conteúdo no meio (a escolha de área, o aviso de acesso não liberado): o
 * mesmo topo e rodapé das áreas, e o conteúdo centralizado no espaço que sobra.
 */
export function CenteredMemberPage({
  children,
  wide,
  back,
}: {
  children: ReactNode;
  wide?: boolean;
  back?: { href: string; label: string } | undefined;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1040px] flex-col px-4 pt-4 pb-8 sm:px-6 sm:pt-6">
      <TopBar back={back} />
      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col justify-center gap-6 py-8 sm:py-12',
          wide ? 'max-w-none' : 'max-w-[480px] lg:max-w-[640px]',
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** As três partes da conversa, nomeadas no topo. */
const PARTS = ['Sobre você', 'Sua marca', 'Confirmar'] as const;

type ConversationLayoutProps = {
  /** Parte atual (0 a 2): dá o nome em cima. */
  part: 0 | 1 | 2;
  /** Quanto da conversa inteira já foi (0 a 1): a barra enche etapa a etapa. */
  progress: number;
  /** "Pergunta 3 de 10", "Revisão"... */
  stepLabel: string;
  /** Pra onde o "voltar" leva. */
  backHref: string;
  children: ReactNode;
};

/**
 * Moldura das telas da conversa: no topo, voltar, onde ela está e "Continuar depois" (discreto:
 * a pergunta é o que importa); embaixo, uma barra fina com o progresso da conversa inteira. O
 * conteúdo fica numa coluna, centralizado na vertical a partir do tablet (no celular, perto do
 * topo, pra caber sem rolar). Tudo são links de verdade: funciona sem JavaScript.
 */
export function ConversationLayout({
  part,
  progress,
  stepLabel,
  backHref,
  children,
}: ConversationLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[560px] flex-col gap-2 px-4 pt-3 sm:px-6">
        <div className="flex items-center gap-1">
          <Link
            href={backHref}
            aria-label="Voltar"
            className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-foreground transition-colors duration-100 outline-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-6" />
          </Link>
          {/* No celular, parte e número em linhas próprias (lado a lado não cabem com o
              "Continuar depois" em 320px); a partir do tablet, numa linha só. */}
          <p className="flex min-w-0 flex-1 flex-col text-sm leading-tight sm:flex-row sm:gap-1">
            <span className="font-semibold">{PARTS[part]}</span>
            <span className="whitespace-nowrap text-muted-foreground">
              <span aria-hidden="true" className="hidden sm:inline">
                ·{' '}
              </span>
              {stepLabel}
            </span>
          </p>
          <Link
            href="/loja-pronta"
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors duration-100 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            Continuar depois
          </Link>
        </div>
        {/* O progresso já está escrito acima; a barra é só o desenho dele. */}
        <div
          aria-hidden="true"
          className="h-1 overflow-hidden rounded-full bg-border forced-colors:border forced-colors:border-[CanvasText]"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none forced-colors:bg-[CanvasText]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-8 px-4 pt-8 pb-10 sm:justify-center sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}

import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** As três partes da conversa, na barra de progresso do topo. */
const PARTS = ['Sobre você', 'Sua marca', 'Confirmar'] as const;

type ConversationLayoutProps = {
  /** Parte atual (0 a 2): dá o nome em cima e marca a barra. */
  part: 0 | 1 | 2;
  /** Quanto da parte atual já foi (0 a 1): a barra enche aos poucos, pergunta a pergunta. */
  progress: number;
  /** "Pergunta 3 de 10", "Revisão"... */
  stepLabel: string;
  /** Pra onde o "voltar" leva. */
  backHref: string;
  children: ReactNode;
};

/**
 * Moldura das telas da conversa: voltar, onde ela está (parte e pergunta) e "Continuar depois"
 * no topo; o conteúdo numa coluna estreita, alinhada em cima (é uma sequência de perguntas, não
 * um cartão no meio da tela). Tudo são links de verdade: funciona sem JavaScript.
 */
export function ConversationLayout({
  part,
  progress,
  stepLabel,
  backHref,
  children,
}: ConversationLayoutProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-10">
      <header className="flex flex-col gap-3 pt-3 pb-4">
        <div className="flex items-center gap-1">
          <Link
            href={backHref}
            aria-label="Voltar"
            className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-foreground transition-colors duration-100 outline-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-6" />
          </Link>
          <p className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-semibold">{PARTS[part]}</span>
            <span className="text-sm text-muted-foreground">{stepLabel}</span>
          </p>
          <Link
            href="/loja-pronta"
            className="-mr-2 inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            Continuar depois
          </Link>
        </div>
        {/* O progresso já está escrito acima; a barra é só o desenho dele. */}
        <div aria-hidden="true" className="flex gap-1.5">
          {PARTS.map((name, index) => {
            const fill = index < part ? 1 : index === part ? progress : 0;
            return (
              <span
                key={name}
                className="h-1.5 flex-1 overflow-hidden rounded-full border border-transparent bg-border forced-colors:border-[CanvasText]"
              >
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none forced-colors:bg-[CanvasText]"
                  style={{ width: `${Math.round(fill * 100)}%` }}
                />
              </span>
            );
          })}
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
    </div>
  );
}

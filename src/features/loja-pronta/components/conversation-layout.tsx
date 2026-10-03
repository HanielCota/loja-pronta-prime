import { CheckIcon, ChevronLeftIcon, DoorOpenIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MemberNavbar, type NavbarAccount } from '@/features/member/components/member-navbar';
import { cn } from '@/lib/utils';
import type { StepHeader } from '../steps';

type ConversationLayoutProps = {
  /** Quem está logada (a barra do topo, a mesma de todas as telas). */
  account: NavbarAccount;
  /** O que o topo diz e mostra (ver stepHeader e brandStepHeader). */
  header: StepHeader;
  /** O aviso de que nada se perde ("Respostas salvas", "Escolhas salvas"). */
  savedLabel: string;
  /** Pra onde o "Voltar" leva. */
  backHref: string;
  /** Telas de trabalho (o estúdio do logo): no computador, a largura da barra do topo. */
  wide?: boolean;
  children: ReactNode;
};

const topLink =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full text-body font-medium transition-colors duration-100 outline-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid';

/**
 * Moldura das telas passo a passo (conversa e marca), pensada pra quem tem pouca prática:
 * - "Voltar" escrito, não só a setinha (muita gente não sabe o que a seta faz);
 * - "Sair e continuar depois" ("Sair", fora do computador) e, quando já tem algo salvo,
 *   "✓ Respostas salvas": sair sem medo;
 * - "Pergunta 3 de 10" (não "3 de 10") e uma barra com um tracinho por pergunta, pra contar
 *   quanto falta.
 * O conteúdo fica numa coluna, centralizado na vertical a partir do tablet (no celular, perto do
 * topo, pra caber sem rolar), e mais larga no computador. Tudo são links de verdade: funciona sem
 * JavaScript.
 */
export function ConversationLayout({
  account,
  header,
  savedLabel,
  backHref,
  wide = false,
  children,
}: ConversationLayoutProps) {
  const column = cn(
    'mx-auto flex w-full max-w-[560px] flex-col px-4 sm:px-6',
    wide ? 'lg:max-w-[1040px]' : 'lg:max-w-[680px]',
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <MemberNavbar account={account} />
      {/* Um <nav>, não <header>: o topo da página já é a barra (um só "banner" pro leitor de tela).
          E dentro de uma região: o voltar, o sair e onde ela está não ficam soltos na página.
          Uma faixa só: voltar, onde ela está (com a barra embaixo) e sair, pro conteúdo subir. */}
      <nav aria-label="Etapa atual" className={cn(column, 'pt-3')}>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href={backHref} className={cn(topLink, '-ml-2 pr-3 pl-1.5 text-foreground')}>
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
            Voltar
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* Sem "·" entre os dois: no celular, o aviso desce pra linha de baixo e o ponto
                ficaria sobrando no começo dela. O ✓ já separa. */}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="font-semibold">{header.label}</span>
              {header.saved ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CheckIcon aria-hidden="true" className="size-4" />
                  {savedLabel}
                </span>
              ) : null}
            </p>
            {/* O progresso já está escrito acima; os tracinhos são só o desenho dele. */}
            <div aria-hidden="true" className="flex gap-1">
              {Array.from({ length: header.total }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 flex-1 rounded-full border border-transparent',
                    index < header.filled
                      ? 'bg-progress forced-colors:bg-[CanvasText]'
                      : 'border-input bg-progress-track forced-colors:border-[CanvasText]',
                  )}
                />
              ))}
            </div>
          </div>
          {/* Fora do computador, só "Sair" na tela (cabe ao lado da barra); o nome completo
              continua pro leitor de tela, começando pelo que está escrito. */}
          <Link
            href="/loja-pronta"
            aria-label="Sair e continuar depois"
            className={cn(topLink, '-mr-2 px-3 text-muted-foreground hover:text-foreground')}
          >
            {/* No celular bem pequeno (320px), só o texto: o ícone não cabe junto. */}
            <DoorOpenIcon aria-hidden="true" className="hidden size-5 min-[360px]:block" />
            <span className="lg:hidden">Sair</span>
            <span className="hidden lg:inline">Sair e continuar depois</span>
          </Link>
        </div>
      </nav>
      <main className={cn(column, 'flex-1 gap-8 pt-8 pb-10 sm:justify-center sm:py-12')}>
        {children}
      </main>
    </div>
  );
}

import { ChevronLeftIcon, DoorOpenIcon } from 'lucide-react';
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
  /** Pra onde o "Voltar" leva. */
  backHref: string;
  /** Coluna mais larga no computador (o estúdio do logo, com o rascunho ao lado das escolhas). */
  wide?: boolean;
  children: ReactNode;
};

const topLink =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full text-body font-medium transition-colors duration-100 outline-none hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid';

/**
 * Moldura das telas passo a passo (conversa e marca), pensada pra quem tem pouca prática:
 * - "Voltar" escrito, não só a setinha (muita gente não sabe o que a seta faz);
 * - "Terminar depois" ("Sair", fora do computador): sair sem medo de perder o que fez (e sem
 *   parecer mais um "Continuar", como os botões de seguir);
 * - "Pergunta 3 de 10" (não "3 de 10") no meio, e embaixo uma barra com um tracinho por pergunta,
 *   pra ver quanto falta. Nada de letra miúda: o resto quem diz é o título da página.
 * O conteúdo fica numa coluna, centralizado na vertical a partir do tablet (no celular, perto do
 * topo, pra caber sem rolar), e mais larga no computador. Tudo são links de verdade: funciona sem
 * JavaScript.
 */
export function ConversationLayout({
  account,
  header,
  backHref,
  wide = false,
  children,
}: ConversationLayoutProps) {
  const column = cn(
    'mx-auto flex w-full max-w-[560px] flex-col px-4 sm:px-6',
    wide ? 'sm:max-w-[720px] lg:max-w-[1040px]' : 'lg:max-w-[680px]',
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <MemberNavbar account={account} />
      {/* Um <nav>, não <header>: o topo da página já é a barra (um só "banner" pro leitor de tela).
          Uma linha (voltar, onde ela está e sair) e a barra de progresso embaixo, na largura da
          barra do topo (o voltar embaixo da marca, o sair embaixo da conta), não na do conteúdo. */}
      <nav
        aria-label="Etapa atual"
        className="mx-auto flex w-full max-w-[1040px] flex-col gap-2 px-4 pt-3 sm:px-6"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Link
            href={backHref}
            className={cn(topLink, '-ml-2 justify-self-start pr-3 pl-1.5 text-foreground')}
          >
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
            Voltar
          </Link>
          <p className="text-center text-body font-semibold text-balance">
            {header.label}
            {/* O nome da etapa vai junto pro leitor de tela (na tela, o título já diz). */}
            {header.names?.[header.filled - 1] ? (
              <span className="sr-only">: {header.names[header.filled - 1]}</span>
            ) : null}
          </p>
          {/* Fora do computador, só "Sair" na tela (o resto vai pro leitor de tela, depois do que
              está escrito). O nome lido é sempre o que aparece, sem rótulo à parte. */}
          <Link
            href="/loja-pronta"
            className={cn(
              topLink,
              '-mr-2 justify-self-end px-3 text-muted-foreground hover:text-foreground',
            )}
          >
            {/* No celular bem pequeno (320px), só o texto: o ícone não cabe junto. */}
            <DoorOpenIcon aria-hidden="true" className="hidden size-5 min-[360px]:block" />
            <span className="lg:hidden">
              Sair<span className="sr-only"> e terminar depois</span>
            </span>
            <span className="hidden lg:inline">Terminar depois</span>
          </Link>
        </div>
        {/* O progresso já está escrito acima; os tracinhos são só o desenho dele. */}
        <div aria-hidden="true" className="flex gap-1.5">
          {Array.from({ length: header.total }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full border border-transparent transition-colors duration-300 motion-reduce:transition-none',
                index < header.filled
                  ? 'bg-progress forced-colors:bg-[CanvasText]'
                  : 'bg-progress-track forced-colors:border-[CanvasText]',
              )}
            />
          ))}
        </div>
      </nav>
      <main className={cn(column, 'flex-1 gap-8 pt-8 pb-10 sm:justify-center sm:py-12')}>
        {children}
      </main>
    </div>
  );
}

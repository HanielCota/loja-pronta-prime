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
  /**
   * Largura do conteúdo no computador: `normal` (perguntas), `wide` (a da barra do topo) ou
   * `editor` (o editor do logo, mais largo que a barra: o painel e o quadro precisam de espaço).
   */
  width?: 'normal' | 'wide' | 'editor';
  children: ReactNode;
};

const topLink =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full text-body font-medium transition-colors duration-100 outline-none hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid';

/**
 * Moldura das telas passo a passo (conversa e marca), pensada pra quem tem pouca prática:
 * - "Voltar" escrito, não só a setinha (muita gente não sabe o que a seta faz);
 * - "Sair e continuar depois" ("Sair", fora do computador): sair sem medo;
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
  width = 'normal',
  children,
}: ConversationLayoutProps) {
  const column = cn(
    'mx-auto flex w-full max-w-[560px] flex-col px-4 sm:px-6',
    { normal: 'lg:max-w-[680px]', wide: 'lg:max-w-[1040px]', editor: 'lg:max-w-[1320px]' }[width],
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <MemberNavbar account={account} />
      {/* Um <nav>, não <header>: o topo da página já é a barra (um só "banner" pro leitor de tela).
          E dentro de uma região: o voltar, o sair e onde ela está não ficam soltos na página.
          Uma faixa só: voltar, onde ela está (com a barra embaixo) e sair, pro conteúdo subir. */}
      {/* Um <nav>, não <header>: o topo da página já é a barra (um só "banner" pro leitor de tela).
          Uma linha (voltar, onde ela está e sair) e a barra de progresso embaixo, na largura toda. */}
      {/* Na largura da barra do topo (o voltar embaixo da marca, o sair embaixo da conta), não na
          do conteúdo. */}
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
          {/* Fora do computador, só "Sair" na tela; o nome completo continua pro leitor de tela,
              começando pelo que está escrito. */}
          <Link
            href="/loja-pronta"
            aria-label="Sair e continuar depois"
            className={cn(
              topLink,
              '-mr-2 justify-self-end px-3 text-muted-foreground hover:text-foreground',
            )}
          >
            {/* No celular bem pequeno (320px), só o texto: o ícone não cabe junto. */}
            <DoorOpenIcon aria-hidden="true" className="hidden size-5 min-[360px]:block" />
            <span className="lg:hidden">Sair</span>
            <span className="hidden lg:inline">Sair e continuar depois</span>
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
      <main
        className={cn(
          column,
          // O editor usa a altura toda (o quadro cabe na janela); o resto fica no meio.
          width === 'editor'
            ? 'flex-1 gap-5 pt-6 pb-6'
            : 'flex-1 gap-8 pt-8 pb-10 sm:justify-center sm:py-12',
        )}
      >
        {children}
      </main>
    </div>
  );
}

import Image from 'next/image';
import { mascotStill } from './mascot/art';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  MEMBER_AREA_COLUMN_GAP,
  MEMBER_AREA_GUTTERS,
  MEMBER_AREA_MAX_WIDTH,
  MEMBER_AREA_SIDEBAR_COLUMNS,
} from '@/lib/member-layout';

/** A marca (o mascote e o nome), que leva ao menu das áreas: na barra do topo e no menu do SLL. */
export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/menu"
      prefetch={false}
      className={cn(
        '-ml-1 flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body font-semibold whitespace-nowrap text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
        className,
      )}
    >
      <Image src={mascotStill} alt="" width={32} height={32} className="size-8" />
      Escala Shop
    </Link>
  );
}

/**
 * Barra do topo de todas as telas, com uma linha fina embaixo de ponta a ponta: a marca à
 * esquerda (leva ao menu das áreas; quem não entrou cai no login), as abas das áreas (`nav`, pra
 * quem tem os dois produtos) e, à direita, o que a tela tiver (a conta, nas telas de dentro). O
 * voltar fica no conteúdo, na trilha acima do título.
 *
 * `sticky` (as áreas): do tablet pra cima, a barra fica presa no topo ao rolar, com o fundo
 * translúcido e desfocado, como no site da Apple. No celular ela rola junto (com as abas, ela tem
 * duas linhas e tomaria espaço demais). Com "Mais contraste" ou o pedido do aparelho por menos
 * transparência, o fundo fica sólido.
 */
export function SiteNavbar({
  children,
  nav,
  hasSidebar = false,
  sticky = false,
}: {
  children?: ReactNode;
  nav?: ReactNode;
  hasSidebar?: boolean;
  sticky?: boolean;
}) {
  return (
    <header
      data-sticky={sticky || undefined}
      className={cn(
        'border-b border-border bg-background',
        sticky &&
          'sm:sticky sm:top-0 sm:z-40 sm:bg-background/80 sm:backdrop-blur-xl sm:backdrop-saturate-150 opaque:sm:bg-background opaque:sm:backdrop-blur-none opaque:sm:backdrop-saturate-100',
      )}
    >
      <div
        className={cn(
          'mx-auto grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4',
          MEMBER_AREA_GUTTERS,
          nav
            ? // Com abas: até o computador, elas ficam numa linha só delas, embaixo (no tablet, com
              // o texto "Maior", não cabem ao lado da marca e da conta); no computador, ficam entre
              // as duas (com o menu lateral, alinhadas com o conteúdo).
              [
                'pt-2 lg:gap-x-8 lg:pt-0',
                hasSidebar
                  ? [MEMBER_AREA_MAX_WIDTH, 'lg:grid-cols-[240px_minmax(0,1fr)_auto]']
                  : ['max-w-[1040px]', 'lg:grid-cols-[auto_minmax(0,1fr)_auto]'],
              ]
            : hasSidebar
              ? [MEMBER_AREA_MAX_WIDTH, MEMBER_AREA_SIDEBAR_COLUMNS, MEMBER_AREA_COLUMN_GAP]
              : 'max-w-[1040px]',
        )}
      >
        <BrandLink className="justify-self-start" />
        {nav ? (
          // No computador, uma linha vertical curta separa as abas da marca.
          <div
            className={cn(
              'col-span-2 row-start-2 flex gap-8 self-stretch lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:before:my-auto lg:before:h-6 lg:before:w-px lg:before:bg-border',
              // Com o menu lateral, as abas se alinham com o conteúdo: a coluna já as separa.
              hasSidebar && 'lg:before:hidden',
            )}
          >
            {nav}
          </div>
        ) : null}
        {children ? (
          <div
            className={cn(
              'col-start-2 row-start-1 justify-self-end',
              nav ? 'lg:col-start-3' : hasSidebar && 'lg:col-start-2',
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}

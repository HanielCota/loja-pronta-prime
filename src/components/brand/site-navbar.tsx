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

/**
 * Barra do topo de todas as telas, com uma linha embaixo de ponta a ponta: a marca à esquerda
 * (leva ao menu das áreas; quem não entrou cai no login), as abas das áreas (`nav`, pra quem tem
 * os dois produtos) e, à direita, o que a tela tiver (a conta, nas telas de dentro). O voltar
 * fica no conteúdo, na trilha acima do título.
 */
export function SiteNavbar({
  children,
  nav,
  hasSidebar = false,
}: {
  children?: ReactNode;
  nav?: ReactNode;
  hasSidebar?: boolean;
}) {
  return (
    <header className="border-b-2 border-border bg-background">
      <div
        className={cn(
          'mx-auto grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4',
          MEMBER_AREA_GUTTERS,
          nav
            ? // Com abas: no celular, elas descem pra uma linha só delas; do tablet pra cima, ficam
              // entre a marca e a conta (com o menu lateral, alinhadas com o conteúdo).
              [
                'pt-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-8 sm:pt-0',
                hasSidebar
                  ? [MEMBER_AREA_MAX_WIDTH, 'lg:grid-cols-[240px_minmax(0,1fr)_auto]']
                  : 'max-w-[1040px]',
              ]
            : hasSidebar
              ? [MEMBER_AREA_MAX_WIDTH, MEMBER_AREA_SIDEBAR_COLUMNS, MEMBER_AREA_COLUMN_GAP]
              : 'max-w-[1040px]',
        )}
      >
        <Link
          href="/menu"
          prefetch={false}
          className="-ml-1 flex min-h-11 items-center gap-2 justify-self-start rounded-full py-1 pr-3 pl-1 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <Image src={mascotStill} alt="" width={32} height={32} className="size-8" />
          Loja Pronta Prime
        </Link>
        {nav ? (
          <div className="col-span-2 row-start-2 flex self-stretch sm:col-span-1 sm:col-start-2 sm:row-start-1">
            {nav}
          </div>
        ) : null}
        {children ? (
          <div
            className={cn(
              'col-start-2 row-start-1 justify-self-end',
              nav ? 'sm:col-start-3' : hasSidebar && 'lg:col-start-2',
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}

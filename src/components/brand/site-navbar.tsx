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
 * (leva ao menu das áreas; quem não entrou cai no login) e, à direita, o que a tela tiver (a
 * conta, nas telas de dentro). O voltar fica no conteúdo, na trilha acima do título.
 */
export function SiteNavbar({
  children,
  hasSidebar = false,
}: {
  children?: ReactNode;
  hasSidebar?: boolean;
}) {
  return (
    <header className="border-b-2 border-border bg-background">
      <div
        className={cn(
          'mx-auto grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4',
          MEMBER_AREA_GUTTERS,
          hasSidebar
            ? [MEMBER_AREA_MAX_WIDTH, MEMBER_AREA_SIDEBAR_COLUMNS, MEMBER_AREA_COLUMN_GAP]
            : 'max-w-[1040px]',
        )}
      >
        <Link
          href="/menu"
          prefetch={false}
          className="-ml-1 flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <Image src={mascotStill} alt="" width={32} height={32} className="size-8" />
          Loja Pronta Prime
        </Link>
        {children ? (
          <div className={cn('justify-self-end', hasSidebar && 'lg:col-start-2')}>{children}</div>
        ) : null}
      </div>
    </header>
  );
}

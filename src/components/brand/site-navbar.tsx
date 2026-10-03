import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Barra do topo de todas as telas, com uma linha embaixo de ponta a ponta: a marca à esquerda
 * (leva ao início; quem não entrou cai no login) e, à direita, o que a tela tiver (a conta, nas
 * telas de dentro). O voltar fica no conteúdo, na trilha acima do título.
 */
export function SiteNavbar({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b-2 border-border bg-background">
      <div className="mx-auto flex min-h-16 w-full max-w-[1040px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="-ml-1 flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <Image src="/brand/mascote.png" alt="" width={32} height={32} className="size-8" />
          Loja Pronta Prime
        </Link>
        {children}
      </div>
    </header>
  );
}

import type { ReactNode } from 'react';
import { Logo } from './logo';
import type { Expression } from './mascot';

type BrandCardProps = {
  children: ReactNode;
  /** Expressão de repouso do mascote no topo do cartão. */
  expression?: Expression;
  /** Mascote menor, pras telas de dentro da área da aluna. */
  compact?: boolean;
};

/** Cartão com a marca no topo e conteúdo centralizado (estilo iCloud). */
export function BrandCard({ children, expression, compact }: BrandCardProps) {
  return (
    // Alto contraste: a sombra some; a borda desenha o cartão.
    <section className="flex flex-col gap-8 rounded-card bg-card px-6 py-10 shadow-card sm:px-10 sm:py-12 lg:px-16 forced-colors:border forced-colors:border-[CanvasText] short:gap-4 short:py-5">
      <Logo expression={expression} compact={compact} />
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

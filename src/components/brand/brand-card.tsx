import type { ReactNode } from 'react';
import { Logo } from './logo';
import type { Expression } from './mascot';

type BrandCardProps = {
  children: ReactNode;
  /** Expressão de repouso do mascote no topo do cartão. */
  expression?: Expression;
};

/** Cartão com a marca no topo e conteúdo centralizado (estilo iCloud). */
export function BrandCard({ children, expression }: BrandCardProps) {
  return (
    <section className="flex flex-col gap-8 rounded-card bg-card px-6 py-10 shadow-card sm:px-10 sm:py-12 lg:px-16">
      <Logo expression={expression} />
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

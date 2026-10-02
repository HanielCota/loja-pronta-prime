import { HouseIcon } from 'lucide-react';
import Link from 'next/link';
import type { ProductId } from '@/config/products';
import { cn } from '@/lib/utils';
import { PRODUCTS } from '../catalog';
import { AccountMenu } from './account-menu';

export type MemberHeaderProps = {
  products: ProductId[];
  /** Área aberta agora (no início, nenhuma). */
  current?: ProductId;
  name: string;
  email: string;
};

const segment =
  'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium outline-none transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid';
const segmentState = (active: boolean) =>
  active ? 'bg-card text-foreground shadow-sm' : 'text-foreground/75 hover:text-foreground';

/**
 * Barra do topo da área da aluna, translúcida sobre o conteúdo. Com os dois produtos, o início e
 * a troca de área ficam aqui (estilo controle segmentado); a conta e o sair, no menu à direita.
 */
export function MemberHeader({ products, current, name, email }: MemberHeaderProps) {
  const hasChoice = products.length > 1;
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        {hasChoice ? (
          <nav aria-label="Áreas" className="min-w-0">
            <ul className="flex rounded-full bg-black/5 p-1">
              <li>
                <Link
                  href="/"
                  aria-current={current ? undefined : 'page'}
                  className={cn(segment, segmentState(!current), 'px-3')}
                >
                  <HouseIcon aria-hidden="true" className="size-4" />
                  <span className="sr-only">Início</span>
                </Link>
              </li>
              {products.map((product) => (
                <li key={product}>
                  <Link
                    href={PRODUCTS[product].path}
                    aria-current={product === current ? 'page' : undefined}
                    className={cn(segment, segmentState(product === current))}
                  >
                    {PRODUCTS[product].name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <div className="ml-auto">
          <AccountMenu name={name} email={email} />
        </div>
      </div>
    </header>
  );
}

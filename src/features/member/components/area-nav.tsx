import { GraduationCapIcon, StoreIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { PRODUCT_IDS, type ProductId } from '@/config/products';
import { PRODUCTS } from '@/features/products/catalog';
import { cn } from '@/lib/utils';

/** O desenho de cada área (o nome vem do catálogo). */
const ICONS: Record<ProductId, LucideIcon> = { 'loja-pronta': StoreIcon, sll: GraduationCapIcon };

/** A Loja Pronta primeiro, como na escolha de área. */
const ORDER: ProductId[] = ['loja-pronta', ...PRODUCT_IDS.filter((id) => id !== 'loja-pronta')];

/**
 * Pra quem tem os dois produtos: as áreas como abas na barra do topo, do jeito tradicional de um
 * site. A da vez fica com um traço azul em cima da linha da barra. Um toque troca de área, sem
 * passar pela escolha do início. São links de verdade (funcionam sem JavaScript); o leitor de tela
 * ouve "página atual" na da vez.
 */
export function AreaNav({ current }: { current: ProductId }) {
  return (
    <nav aria-label="Suas áreas" className="flex">
      <ul className="flex gap-6">
        {ORDER.map((id) => {
          const Icon = ICONS[id];
          const active = id === current;
          return (
            <li key={id} className="flex">
              <Link
                href={PRODUCTS[id].path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // -mb-0.5: o traço fica por cima da linha de baixo da barra.
                  '-mb-0.5 flex min-h-11 items-center gap-2 border-b-2 text-body font-semibold whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150',
                  active
                    ? 'border-primary text-foreground forced-colors:border-[Highlight]'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {PRODUCTS[id].name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

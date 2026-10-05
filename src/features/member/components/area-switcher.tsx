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
 * Pra quem tem os dois produtos: as duas áreas lado a lado, no topo de cada uma, como um botão de
 * duas posições (a da vez marcada). Um toque troca de área, sem passar pela escolha do início.
 * São links de verdade (funcionam sem JavaScript); o leitor de tela ouve "página atual" na da vez.
 */
export function AreaSwitcher({ current }: { current: ProductId }) {
  return (
    <nav aria-label="Suas áreas" className="mb-2">
      <ul className="inline-flex max-w-full gap-1 rounded-full bg-segment p-1 forced-colors:border forced-colors:border-[CanvasText]">
        {ORDER.map((id) => {
          const Icon = ICONS[id];
          const active = id === current;
          return (
            <li key={id} className="min-w-0">
              <Link
                href={PRODUCTS[id].path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-full px-4 text-body font-semibold whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150',
                  active
                    ? 'bg-segment-thumb text-foreground shadow-sm forced-colors:border-2 forced-colors:border-[Highlight]'
                    : 'text-muted-foreground hover:text-foreground',
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

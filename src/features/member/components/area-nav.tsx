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
 * site. O nome da aba diz o que tem lá ("Minha loja", "Curso SLL"), pra não repetir a marca ao
 * lado. A da vez tem o ícone azul e um traço azul de 3px por cima da linha da barra. Um toque
 * troca de área, sem passar pela escolha do início. São links de verdade (funcionam sem
 * JavaScript); o leitor de tela ouve "página atual" na da vez.
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
                  // O traço é um ::after colado no pé da barra (-bottom-px: por cima da linha de
                  // 1px). No alto contraste, ele usa a cor de destaque do sistema.
                  'relative flex min-h-11 items-center gap-2 text-body font-semibold whitespace-nowrap outline-none after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150 motion-safe:after:transition-colors forced-colors:after:[forced-color-adjust:none]',
                  active
                    ? 'text-foreground after:bg-primary forced-colors:after:bg-[Highlight]'
                    : 'text-muted-foreground after:bg-transparent hover:text-foreground hover:after:bg-border',
                )}
              >
                <Icon aria-hidden="true" className={cn('size-5 shrink-0', active && 'text-link')} />
                {PRODUCTS[id].tab}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

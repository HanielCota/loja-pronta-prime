import { RocketIcon, StoreIcon } from 'lucide-react';
import type { ProductId } from '@/config/products';

const ICONS = { sll: RocketIcon, 'loja-pronta': StoreIcon } satisfies Record<ProductId, unknown>;

/** Ícone do produto num círculo azul-claro (decorativo: o nome do produto vem ao lado). */
export function ProductIcon({ product }: { product: ProductId }) {
  const Icon = ICONS[product];
  return (
    <span
      aria-hidden="true"
      className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
    >
      <Icon className="size-6" />
    </span>
  );
}

import type { ProductId } from '@/config/products';

/** Nome curto do produto nas listas do painel. */
export function productLabel(product: ProductId): string {
  return product === 'sll' ? 'SLL' : 'Loja Pronta';
}

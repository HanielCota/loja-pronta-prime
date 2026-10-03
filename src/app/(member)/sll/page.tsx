import type { Metadata } from 'next';
import { PRODUCTS } from '@/features/products/catalog';
import { SllArea } from '@/features/products/components/sll-area';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: PRODUCTS['sll'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const { session, products, firstVisit } = await requireProduct('sll');
  return <SllArea user={session.user} firstVisit={firstVisit} hasChoice={products.length > 1} />;
}

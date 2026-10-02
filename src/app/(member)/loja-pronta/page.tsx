import type { Metadata } from 'next';
import { PRODUCTS } from '@/features/products/catalog';
import { ProductArea } from '@/features/products/components/product-area';
import { getStorePhase, requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: PRODUCTS['loja-pronta'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const { session, firstVisit } = await requireProduct('loja-pronta');
  return (
    <ProductArea
      product="loja-pronta"
      user={session.user}
      firstVisit={firstVisit}
      storePhase={await getStorePhase(session.user.id)}
    />
  );
}

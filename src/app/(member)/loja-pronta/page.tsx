import type { Metadata } from 'next';
import { StorePanel } from '@/features/loja-pronta/components/store-panel';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { PRODUCTS } from '@/features/products/catalog';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: PRODUCTS['loja-pronta'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const { session, products, firstVisit } = await requireProduct('loja-pronta');
  const { phase, conversation } = await getStoreOverview(session.user.id);
  return (
    <StorePanel
      user={session.user}
      firstVisit={firstVisit}
      hasChoice={products.length > 1}
      phase={phase}
      conversation={conversation}
    />
  );
}

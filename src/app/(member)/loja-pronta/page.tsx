import type { Metadata } from 'next';
import { PRODUCTS } from '@/features/products/catalog';
import { getOnboarding } from '@/features/onboarding/server/conversation';
import { ProductArea } from '@/features/products/components/product-area';
import { getStorePhase, requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: PRODUCTS['loja-pronta'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const { session, products, firstVisit } = await requireProduct('loja-pronta');
  const [storePhase, onboarding] = await Promise.all([
    getStorePhase(session.user.id),
    getOnboarding(session.user.id),
  ]);
  return (
    <ProductArea
      product="loja-pronta"
      user={session.user}
      firstVisit={firstVisit}
      hasChoice={products.length > 1}
      storePhase={storePhase}
      conversation={
        onboarding.completedAt
          ? 'enviada'
          : Object.keys(onboarding.answers).length > 0
            ? 'em-andamento'
            : 'nao-comecou'
      }
    />
  );
}

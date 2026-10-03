import type { Metadata } from 'next';
import { PRODUCTS } from '@/features/products/catalog';
import { getOnboarding } from '@/features/onboarding/server/conversation';
import { StorePanel } from '@/features/products/components/store-panel';
import { displayedPhase } from '@/features/products/store-phase';
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
    <StorePanel
      user={session.user}
      firstVisit={firstVisit}
      hasChoice={products.length > 1}
      phase={displayedPhase(storePhase, Boolean(onboarding.completedAt))}
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

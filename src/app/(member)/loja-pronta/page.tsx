import type { Metadata } from 'next';
import { brandLogoSrc } from '@/features/brand/steps';
import { getBrand } from '@/features/brand/server/brand';
import { StorePanel } from '@/features/loja-pronta/components/store-panel';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { PRODUCTS } from '@/features/products/catalog';
import { requireProduct } from '@/features/products/server/access';
import { listLegacyStoresForUser } from '@/features/legacy-stores/server/queries';
import { LegacyStoreHistory } from '@/features/legacy-stores/components/store-history';
import { AreaShell } from '@/features/member/components/area-shell';

export const metadata: Metadata = {
  title: PRODUCTS['loja-pronta'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const { session, products } = await requireProduct('loja-pronta');
  const [{ phase, conversation }, brand, previousStores] = await Promise.all([
    getStoreOverview(session.user.id),
    getBrand(session.user.id),
    listLegacyStoresForUser(session.user.id),
  ]);
  if (previousStores.length && phase === 1 && conversation === 'nao-comecou') {
    return (
      <AreaShell
        account={session.user}
        hasChoice={products.length > 1}
        area="loja-pronta"
        crumb="Loja Pronta"
        title="Your stores"
        intro="Review your saved stores and recorded deliveries."
      >
        <LegacyStoreHistory stores={previousStores} basePath="/loja-pronta/previous-stores" />
      </AreaShell>
    );
  }
  return (
    <StorePanel
      user={session.user}
      hasChoice={products.length > 1}
      phase={phase}
      conversation={conversation}
      previousStores={
        <LegacyStoreHistory stores={previousStores} basePath="/loja-pronta/previous-stores" />
      }
      brand={{
        name: brand.name,
        logoSrc: brand.logoImage ? brandLogoSrc(brand) : null,
        started: Boolean(brand.name),
        confirmed: Boolean(brand.completedAt),
      }}
    />
  );
}

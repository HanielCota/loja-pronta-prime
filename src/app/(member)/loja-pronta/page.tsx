import type { Metadata } from 'next';
import { savedLogoSrc } from '@/features/brand/logo-preview';
import { getBrand } from '@/features/brand/server/brand';
import { StorePanel } from '@/features/loja-pronta/components/store-panel';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { PRODUCTS } from '@/features/products/catalog';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: PRODUCTS['loja-pronta'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const { session, products } = await requireProduct('loja-pronta');
  const [{ phase, conversation }, brand] = await Promise.all([
    getStoreOverview(session.user.id),
    getBrand(session.user.id),
  ]);
  return (
    <StorePanel
      user={session.user}
      hasChoice={products.length > 1}
      phase={phase}
      conversation={conversation}
      brand={{
        name: brand.name,
        logoSrc: brand.logo ? savedLogoSrc({ ...brand, logo: brand.logo }) : null,
        started: Boolean(brand.name),
        confirmed: Boolean(brand.completedAt),
      }}
    />
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brandLogoSrc } from '@/features/brand/steps';
import { getBrand } from '@/features/brand/server/brand';
import { StorePanel } from '@/features/loja-pronta/components/store-panel';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { PRODUCTS } from '@/features/products/catalog';
import { requireProduct } from '@/features/products/server/access';
import { listLegacyStoresForUser } from '@/features/legacy-stores/server/queries';
import { LegacyStoreHistory } from '@/features/legacy-stores/components/store-history';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { CONVERSATION_PATH } from '@/features/loja-pronta/steps';

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
      <AreaPage
        hasChoice={products.length > 1}
        area="loja-pronta"
        crumb="Loja Pronta"
        title="Suas lojas"
        intro="Sua loja anterior está salva. Continue com ela sem começar de novo."
      >
        <LegacyStoreHistory
          stores={previousStores}
          basePath="/loja-pronta/previous-stores"
          canContinue
        />
        <details className={`${panelCard} gap-5`}>
          <summary className="text-body font-semibold">Quero montar outra loja</summary>
          <p className="mt-4 text-body text-muted-foreground">
            Use esta opção só para criar uma loja nova. Sua loja anterior continua salva.
          </p>
          <Button asChild className="mt-4 w-fit" variant="soft">
            <Link href={CONVERSATION_PATH}>
              Começar uma nova loja
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </details>
      </AreaPage>
    );
  }
  return (
    <StorePanel
      user={session.user}
      hasChoice={products.length > 1}
      phase={phase}
      conversation={conversation}
      previousStores={
        <LegacyStoreHistory
          stores={previousStores}
          basePath="/loja-pronta/previous-stores"
          canContinue
        />
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

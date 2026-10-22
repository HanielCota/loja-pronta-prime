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
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
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
      <AreaShell
        account={session.user}
        hasChoice={products.length > 1}
        area="loja-pronta"
        crumb="Loja Pronta"
        title="Suas lojas"
        intro="Veja suas lojas salvas e as entregas registradas."
      >
        {/* Sem isso, quem tinha loja no sistema antigo ficava presa no histórico, sem conseguir
            começar a loja aqui. */}
        <section aria-labelledby="new-store" className={`${panelCard} gap-5`}>
          <div>
            <h2 id="new-store" className="text-title font-semibold text-balance">
              Montar sua loja aqui
            </h2>
            <p className="mt-2 text-body text-muted-foreground">
              Comece do início neste site. Suas lojas anteriores continuam salvas logo abaixo.
            </p>
          </div>
          <Button asChild className="w-fit">
            <Link href={CONVERSATION_PATH}>
              Começar minha loja
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </section>
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

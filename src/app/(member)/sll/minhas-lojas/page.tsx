import type { Metadata } from 'next';
import { Store } from 'lucide-react';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Minhas Lojas · SLL' };

/** Não mostra lojas fictícias enquanto a conexão real com a Shopee não estiver pronta. */
export default async function SllStoresPage() {
  const { session, products } = await requireProduct('sll');

  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="sll"
      title="Minhas Lojas"
      intro="Acompanhe as lojas da Shopee conectadas à sua conta."
    >
      <section className={panelCard} aria-labelledby="stores-coming-soon">
        <Store aria-hidden="true" className="size-7 text-link" />
        <h2 id="stores-coming-soon" className="mt-3 text-title font-semibold text-foreground">
          A conexão da Shopee chega em breve
        </h2>
        <p className="mt-2 text-body text-muted-foreground">
          Quando a integração estiver disponível, suas lojas e seus dados aparecerão aqui.
        </p>
      </section>
    </AreaShell>
  );
}

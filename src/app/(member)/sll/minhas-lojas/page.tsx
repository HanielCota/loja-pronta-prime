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
      intro="Aqui você vai ver suas lojas da Shopee."
    >
      <section className={panelCard} aria-labelledby="stores-coming-soon">
        <Store aria-hidden="true" className="size-7 text-link" />
        <h2 id="stores-coming-soon" className="mt-3 text-title font-semibold text-foreground">
          A conexão da Shopee chega em breve
        </h2>
        <p className="mt-2 text-body text-muted-foreground">
          Quando a conexão abrir, suas lojas e as vendas delas aparecem nesta página.
        </p>
      </section>
    </AreaShell>
  );
}

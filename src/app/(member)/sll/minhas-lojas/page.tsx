import type { Metadata } from 'next';
import { Store } from 'lucide-react';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Minhas Lojas · SLL' };

/** Não mostra lojas fictícias enquanto a conexão real com a Shopee não estiver pronta. */
export default async function SllStoresPage() {
  const { session, products } = await requireProduct('sll');

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Minhas Lojas"
      intro="Aqui você vai ver suas lojas da Shopee."
    >
      <section className={`${panelCard} gap-4`} aria-labelledby="stores-coming-soon">
        <div className="flex items-center justify-between gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-link">
            <Store aria-hidden="true" className="size-6" />
          </span>
          <span className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
            Shopee · Em breve
          </span>
        </div>
        <h2 id="stores-coming-soon" className="mt-3 text-title font-semibold text-foreground">
          A conexão da Shopee chega em breve
        </h2>
        <p className="mt-2 text-body text-muted-foreground">
          Quando a conexão abrir, suas lojas e as vendas delas aparecem nesta página.
        </p>
      </section>
    </SllAreaShell>
  );
}

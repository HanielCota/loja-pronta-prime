import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import type { LegacyStore } from '../model';
import { legacyDeliveryLabel } from '../model';

export function LegacyStoreHistory({
  stores,
  basePath,
}: {
  stores: { id: string; record: LegacyStore; products: number }[];
  basePath: string;
}) {
  if (!stores.length) return null;
  return (
    <section aria-labelledby="previous-stores" className={`${panelCard} gap-5`}>
      <div>
        <h2 id="previous-stores" className="text-title font-semibold text-balance">
          Lojas anteriores
        </h2>
        <p className="mt-2 text-body text-muted-foreground">
          Veja os dados salvos das suas lojas e as entregas registradas.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {stores.map((store) => (
          <li
            key={store.id}
            className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-body font-semibold wrap-anywhere">
                {store.record.nome || store.record.shopee_nome || 'Nome da loja não informado'}
              </h3>
              <p className="text-body text-muted-foreground">
                {legacyDeliveryLabel(store.record.situacao_entrega)}
              </p>
              <p className="text-sm text-muted-foreground">
                {store.record.loja_shopee_vinculada_id
                  ? 'Produtos ligados a outra loja salva'
                  : `${store.products} produtos salvos`}
              </p>
            </div>
            <Button asChild variant="soft" size="inline" className="w-fit px-5">
              <Link href={`${basePath}/${store.id}`}>
                Ver loja
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

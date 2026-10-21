import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import {
  legacyDeliveryLabel,
  legacyListingLabel,
  legacyPublicationLabel,
  legacyPendingLabel,
  legacyProductUrl,
  legacyShopUrl,
  type LegacyProduct,
  type LegacyStore,
} from '../model';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL' });

export function LegacyStoreDetail({
  store,
  linked,
  products,
  total,
  purchases,
  page,
  basePath,
}: {
  store: LegacyStore;
  linked?: { record: LegacyStore } | undefined;
  products: { id: string; record: LegacyProduct }[];
  total: number;
  purchases: { transaction: string }[];
  page: number;
  basePath: string;
}) {
  const shopUrl = legacyShopUrl(store.shopee_shop_id);
  const productShopId = linked?.record.shopee_shop_id ?? store.shopee_shop_id;
  return (
    <>
      <p className="rounded-2xl bg-primary-soft p-5 text-body text-foreground">
        These are saved delivery records. They do not confirm the current status of your store or
        listings on Shopee.
      </p>
      <section aria-labelledby="saved-store-details" className={`${panelCard} gap-5`}>
        <h2 id="saved-store-details" className="text-title font-semibold">
          Saved store details
        </h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
          <dt className="text-body text-muted-foreground">Delivery</dt>
          <dd className="text-body">{legacyDeliveryLabel(store.situacao_entrega)}</dd>
          <dt className="text-body text-muted-foreground">Description</dt>
          <dd className="text-body wrap-anywhere whitespace-pre-wrap">
            {store.descricao || 'No description saved'}
          </dd>
          <dt className="text-body text-muted-foreground">Shopee store</dt>
          <dd className="text-body wrap-anywhere">{store.shopee_nome || 'No Shopee name saved'}</dd>
          <dt className="text-body text-muted-foreground">Shopee store ID</dt>
          <dd className="text-body wrap-anywhere">{store.shopee_shop_id || 'No store linked'}</dd>
        </dl>
        {store.pendencias?.length ? (
          <div>
            <h3 className="text-body font-semibold">Recorded pending items</h3>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-body">
              {store.pendencias.map((item, index) => (
                <li className="wrap-anywhere" key={index}>
                  {legacyPendingLabel(item)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {shopUrl ? (
          <Button asChild variant="soft" size="inline" className="w-fit px-5">
            <a href={shopUrl} target="_blank" rel="noopener noreferrer">
              Open store on Shopee
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : null}
        {purchases.length ? (
          <details className="rounded-2xl bg-muted p-5">
            <summary className="text-body font-semibold">Purchase references</summary>
            <ul className="mt-3 space-y-2 text-body">
              {purchases.map((p) => (
                <li key={p.transaction} className="wrap-anywhere">
                  {p.transaction}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
      <section aria-labelledby="saved-store-products" className={`${panelCard} gap-5`}>
        <div>
          <h2 id="saved-store-products" className="text-title font-semibold">
            Saved products ({total})
          </h2>
          {linked ? (
            <p className="mt-2 text-body text-muted-foreground">
              Products linked to{' '}
              {linked.record.nome || linked.record.shopee_nome || 'another saved store'}.
            </p>
          ) : null}
        </div>
        {!total ? (
          <p className="text-body text-muted-foreground">No products were saved for this store.</p>
        ) : (
          <ul className="divide-y divide-border">
            {products.map(({ id, record }) => {
              const url = legacyProductUrl(productShopId, record.shopee_item_id);
              return (
                <li key={id} className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
                  <h3 className="text-body font-semibold wrap-anywhere">
                    {record.titulo || 'Product title unavailable'}
                  </h3>
                  <p className="text-body">{currency.format(record.preco_final)}</p>
                  <p className="text-sm text-muted-foreground">
                    Recorded publication: {legacyPublicationLabel(record.situacao_publicacao)} ·
                    Shopee: {legacyListingLabel(record.situacao_anuncio_shopee)}
                  </p>
                  {record.descricao ? (
                    <details>
                      <summary className="text-body">Saved description</summary>
                      <p className="mt-3 text-body wrap-anywhere whitespace-pre-wrap">
                        {record.descricao}
                      </p>
                    </details>
                  ) : null}
                  {url ? (
                    <Button asChild variant="soft" size="inline" className="w-fit px-5">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Open listing on Shopee
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {total > 30 ? (
          <nav aria-label="Saved product pages" className="flex flex-wrap items-center gap-4">
            {page > 1 ? (
              <Button asChild variant="soft" size="inline" className="w-fit px-5">
                <Link href={`${basePath}?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : null}
            <p className="text-body text-muted-foreground">
              Page {page} of {Math.ceil(total / 30)}
            </p>
            {page * 30 < total ? (
              <Button asChild variant="soft" size="inline" className="w-fit px-5">
                <Link href={`${basePath}?page=${page + 1}`}>Next</Link>
              </Button>
            ) : null}
          </nav>
        ) : null}
      </section>
    </>
  );
}

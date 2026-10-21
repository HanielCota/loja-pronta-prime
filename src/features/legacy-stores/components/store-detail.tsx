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

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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
        Estes são registros de entregas anteriores. Eles não confirmam a situação atual da sua loja
        ou dos anúncios na Shopee.
      </p>
      <section aria-labelledby="saved-store-details" className={`${panelCard} gap-5`}>
        <h2 id="saved-store-details" className="text-title font-semibold">
          Dados salvos da loja
        </h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
          <dt className="text-body text-muted-foreground">Entrega</dt>
          <dd className="text-body">{legacyDeliveryLabel(store.situacao_entrega)}</dd>
          <dt className="text-body text-muted-foreground">Descrição</dt>
          <dd className="text-body wrap-anywhere whitespace-pre-wrap">
            {store.descricao || 'Nenhuma descrição salva'}
          </dd>
          <dt className="text-body text-muted-foreground">Loja na Shopee</dt>
          <dd className="text-body wrap-anywhere">
            {store.shopee_nome || 'Nome na Shopee não informado'}
          </dd>
          <dt className="text-body text-muted-foreground">Número da loja na Shopee</dt>
          <dd className="text-body wrap-anywhere">
            {store.shopee_shop_id || 'Nenhuma loja ligada'}
          </dd>
        </dl>
        {store.pendencias?.length ? (
          <div>
            <h3 className="text-body font-semibold">Pendências registradas</h3>
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
              Abrir loja na Shopee
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : null}
        {purchases.length ? (
          <details className="rounded-2xl bg-muted p-5">
            <summary className="text-body font-semibold">Referências de compra</summary>
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
            Produtos salvos ({total})
          </h2>
          {linked ? (
            <p className="mt-2 text-body text-muted-foreground">
              Produtos ligados a{' '}
              {linked.record.nome || linked.record.shopee_nome || 'outra loja salva'}.
            </p>
          ) : null}
        </div>
        {!total ? (
          <p className="text-body text-muted-foreground">
            Nenhum produto foi salvo para esta loja.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {products.map(({ id, record }) => {
              const url = legacyProductUrl(productShopId, record.shopee_item_id);
              return (
                <li key={id} className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
                  <h3 className="text-body font-semibold wrap-anywhere">
                    {record.titulo || 'Nome do produto não informado'}
                  </h3>
                  <p className="text-body">{currency.format(record.preco_final)}</p>
                  <p className="text-sm text-muted-foreground">
                    Publicação registrada: {legacyPublicationLabel(record.situacao_publicacao)} ·
                    Shopee: {legacyListingLabel(record.situacao_anuncio_shopee)}
                  </p>
                  {record.descricao ? (
                    <details>
                      <summary className="text-body">Descrição salva</summary>
                      <p className="mt-3 text-body wrap-anywhere whitespace-pre-wrap">
                        {record.descricao}
                      </p>
                    </details>
                  ) : null}
                  {url ? (
                    <Button asChild variant="soft" size="inline" className="w-fit px-5">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Abrir anúncio na Shopee
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
          <nav
            aria-label="Páginas dos produtos salvos"
            className="flex flex-wrap items-center gap-4"
          >
            {page > 1 ? (
              <Button asChild variant="soft" size="inline" className="w-fit px-5">
                <Link href={`${basePath}?page=${page - 1}`}>Anterior</Link>
              </Button>
            ) : null}
            <p className="text-body text-muted-foreground">
              Página {page} de {Math.ceil(total / 30)}
            </p>
            {page * 30 < total ? (
              <Button asChild variant="soft" size="inline" className="w-fit px-5">
                <Link href={`${basePath}?page=${page + 1}`}>Próxima</Link>
              </Button>
            ) : null}
          </nav>
        ) : null}
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { LEGACY_CATALOG_RUN } from '@/config/legacy-catalog';
import { Button } from '@/components/ui/button';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { recoveredStores } from '@/features/legacy-stores/server/catalog-data';
import { readRecoveredLegacyCatalog } from '@/features/legacy-stores/server/recovery';
import { importRecoveredCatalog } from '@/features/legacy-stores/server/catalog-actions';
import {
  RecoveredProductPhotos,
  RecoveredProductVariations,
} from '@/features/legacy-stores/components/recovered-product';

export const metadata: Metadata = { title: 'Importar produtos recuperados' };
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export default async function ImportPreviousProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const path = `/loja-pronta/previous-stores/${encodeURIComponent(id)}/import`;
  const { session, products } = await requireProduct('loja-pronta', path);
  const requested = (await searchParams).page;
  const page = /^\d{1,5}$/.test(requested ?? '') && Number(requested) > 0 ? Number(requested) : 1;
  const store = (await recoveredStores(db.$client, session.user.id)).find((row) => row.id === id);
  if (!store || (page - 1) * 30 >= store.available) notFound();
  const recovered = (
    await readRecoveredLegacyCatalog(db.$client, session.user.id, id, {
      runId: LEGACY_CATALOG_RUN,
      recoveredOnly: true,
      limit: 30,
      offset: (page - 1) * 30,
    })
  ).filter((row) => row.status === 'recovered' && row.product);
  const imported = await db.$client.query<{ product_id: string }>(
    'SELECT product_id FROM legacy_catalog_imports WHERE user_id=$1 AND run_id=$2 AND store_id=$3::uuid',
    [session.user.id, LEGACY_CATALOG_RUN, id],
  );
  const used = new Set(imported.rows.map((row) => row.product_id));
  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Importar produtos"
      title="Importar produtos recuperados"
      intro={store.name}
    >
      <Button asChild variant="soft" size="inline" className="w-fit px-5">
        <Link href="/loja-pronta/produtos/recovered">Voltar aos produtos recuperados</Link>
      </Button>
      <section className={`${panelCard} gap-5`} aria-labelledby="import-products">
        <h2 id="import-products" className="text-title font-semibold">
          Escolha os produtos para sua lista
        </h2>
        <p className="text-body text-muted-foreground">
          As fotos, as descrições e as variações serão guardadas na sua lista para revisão. Esta
          ação não publica anúncios na Shopee.
        </p>
        <form action={importRecoveredCatalog} className="flex flex-col gap-6">
          <input type="hidden" name="storeId" value={id} />
          <ul className="divide-y divide-border">
            {recovered.map((row) => {
              const product = row.product!;
              return (
                <li key={row.id} className="flex flex-col gap-4 py-6 first:pt-0">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-semibold wrap-anywhere">
                    <input
                      type="checkbox"
                      name="productId"
                      value={row.id}
                      defaultChecked={!used.has(row.id)}
                      disabled={used.has(row.id)}
                    />
                    {product.title}
                  </label>
                  {used.has(row.id) ? (
                    <p className="text-body text-muted-foreground">
                      Já importado. Suas alterações estão preservadas.
                    </p>
                  ) : null}
                  <p className="text-body">{currency.format(product.priceCents / 100)}</p>
                  <RecoveredProductPhotos product={product} />
                  <details>
                    <summary className="text-body">Descrição recuperada</summary>
                    <p className="mt-3 text-body wrap-anywhere whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </details>
                  <RecoveredProductVariations product={product} />
                </li>
              );
            })}
          </ul>
          {recovered.some((row) => !used.has(row.id)) ? (
            <Button>Importar selecionados para minha lista</Button>
          ) : (
            <p className="text-body">Os produtos desta página já estão na sua lista.</p>
          )}
        </form>
        {store.available > 30 ? (
          <nav
            aria-label="Páginas dos produtos recuperados"
            className="flex flex-wrap items-center gap-4"
          >
            {page > 1 ? (
              <Button asChild variant="soft" size="inline">
                <Link href={`${path}?page=${page - 1}`}>Anterior</Link>
              </Button>
            ) : null}
            <p className="text-body">
              Página {page} de {Math.ceil(store.available / 30)}
            </p>
            {page * 30 < store.available ? (
              <Button asChild variant="soft" size="inline">
                <Link href={`${path}?page=${page + 1}`}>Próxima</Link>
              </Button>
            ) : null}
          </nav>
        ) : null}
      </section>
    </AreaPage>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/server/db';
import { Button } from '@/components/ui/button';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { recoveredStores, importedProducts } from '@/features/legacy-stores/server/catalog-data';

export const metadata: Metadata = { title: 'Produtos recuperados' };
const path = '/loja-pronta/produtos/recovered';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export default async function RecoveredCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; resultado?: string; quantidade?: string }>;
}) {
  const { session, products } = await requireProduct('loja-pronta', path);
  const params = await searchParams;
  const page =
    /^\d{1,5}$/.test(params.page ?? '') && Number(params.page) > 0 ? Number(params.page) : 1;
  const [stores, imported] = await Promise.all([
    recoveredStores(db.$client, session.user.id),
    importedProducts(db.$client, session.user.id, page),
  ]);
  const total = stores.reduce((sum, store) => sum + store.imported, 0);
  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Produtos recuperados"
      title="Produtos recuperados"
      intro="Importe seus produtos antigos para revisar antes de publicar novamente."
    >
      <Button asChild variant="soft" size="inline" className="w-fit px-5">
        <Link href="/loja-pronta">Voltar à minha loja</Link>
      </Button>
      {params.resultado ? (
        <output className="rounded-2xl bg-primary-soft p-5 text-body">
          {params.resultado === 'imported'
            ? 'Importação concluída. Os produtos já estão na sua lista para revisão. Importar novamente mantém as alterações que você já salvou.'
            : params.resultado === 'invalid'
              ? 'Selecione pelo menos um produto e confira os campos antes de continuar.'
              : 'Não foi possível importar essa seleção. Abra sua loja anterior e tente novamente.'}
        </output>
      ) : null}
      <section className={`${panelCard} gap-5`} aria-labelledby="imported-catalog">
        <h2 id="imported-catalog" className="text-title font-semibold">
          Minha lista ({total})
        </h2>
        <p className="text-body text-muted-foreground">
          A importação guarda os produtos aqui no sistema. Antes de publicar na Shopee, será preciso
          confirmar a conexão, o estoque, o custo e o frete atuais.
        </p>
        {!imported.length ? (
          <p className="text-body">
            {total
              ? 'Nenhum produto nesta página.'
              : 'Sua lista ainda está vazia. Escolha uma loja abaixo para importar seus produtos recuperados.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {imported.map((row) => (
              <li
                key={row.product_id}
                className="flex flex-col gap-4 py-5 first:pt-0 sm:flex-row sm:items-center"
              >
                <Image
                  src={`${path}/${row.product_id}/images/0`}
                  alt={row.product.title}
                  width={112}
                  height={112}
                  unoptimized
                  className="rounded-2xl bg-muted object-contain"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="text-body font-semibold wrap-anywhere">{row.product.title}</h3>
                  <p className="text-body">{currency.format(row.product.priceCents / 100)}</p>
                  <p className="text-sm text-muted-foreground">
                    Importado para revisão · {row.product.variants.length} variações
                  </p>
                </div>
                <Button asChild variant="soft" size="inline" className="w-fit px-5">
                  <Link href={`${path}/${row.product_id}`}>Revisar produto</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {total > 30 ? (
          <nav
            aria-label="Páginas dos produtos importados"
            className="flex flex-wrap items-center gap-4"
          >
            {page > 1 ? (
              <Button asChild variant="soft" size="inline">
                <Link href={`${path}?page=${page - 1}`}>Anterior</Link>
              </Button>
            ) : null}
            <p className="text-body">
              Página {page} de {Math.ceil(total / 30)}
            </p>
            {page * 30 < total ? (
              <Button asChild variant="soft" size="inline">
                <Link href={`${path}?page=${page + 1}`}>Próxima</Link>
              </Button>
            ) : null}
          </nav>
        ) : null}
      </section>
      <section className={`${panelCard} gap-5`} aria-labelledby="recoverable-stores">
        <h2 id="recoverable-stores" className="text-title font-semibold">
          Importar de uma loja anterior
        </h2>
        {!stores.length ? (
          <p className="text-body text-muted-foreground">
            Nenhum produto recuperado está disponível para esta conta.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {stores.map((store) => (
              <li
                key={store.id}
                className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-body font-semibold wrap-anywhere">{store.name}</h3>
                  <p className="mt-2 text-body text-muted-foreground">
                    {store.available} produtos recuperados · {store.imported} já importados
                  </p>
                </div>
                <Button asChild variant="soft" size="inline" className="w-fit px-5">
                  <Link href={`/loja-pronta/previous-stores/${store.id}/import`}>
                    Escolher produtos
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AreaPage>
  );
}

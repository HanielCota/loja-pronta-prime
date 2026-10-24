import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SelectMenu } from '@/components/ui/select-menu';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { availableSupplierProducts } from '@/features/assistant/server/catalog';
import { publicationOverview } from '@/features/assistant/server/operations';
import { publicationCorrections } from '@/features/assistant/server/corrections';
import {
  submitPublicationBatch,
  confirmPublicationCorrection,
} from '@/features/assistant/server/publication-actions';
import { batchObservationState } from '@/features/assistant/model';
import { configuredSupplierSources } from '@/features/shopee/supplier-feed';
import { subscribeSupplierFeed } from '@/features/assistant/server/supplier-actions';
import { storeOperationOverview } from '@/features/assistant/server/store-operation-overview';
import {
  checkBrandChange,
  sendStoreBrand,
  retryBrandPublication,
} from '@/features/assistant/server/store-change-actions';
import { brandPublicationEnabled } from '@/features/brand/server/publication-settings';
import { getBrand } from '@/features/brand/server/brand-store';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { redirect } from 'next/navigation';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Produtos da minha loja' };
const statusLabels = {
  pending: 'Aguardando publicação',
  sending: 'Publicando',
  published: 'Publicado',
  unknown: 'Aguardando confirmação da Shopee',
  failed: 'Publicação não aceita',
};
const date = (value: Date) => value.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export default async function StoreProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct('loja-pronta', '/loja-pronta/produtos');
  if ((await getStorePhase(session.user.id)) < 5) redirect('/loja-pronta/shopee/conectar');
  const [catalog, overview, params, corrections, operations, brand] = await Promise.all([
    availableSupplierProducts(session.user.id, session.user.role),
    publicationOverview(session.user.id),
    searchParams,
    publicationCorrections(session.user.id),
    storeOperationOverview(session.user.id),
    getBrand(session.user.id),
  ]);
  const initial = overview.batches.find((batch) => batch.kind === 'initial');
  const maySelect = !initial || initial.status === 'evaluated';
  const result = getParam(params.resultado);
  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Produtos"
      title="Produtos da minha loja"
      intro="Comece com cinco produtos. Acompanhe o que acontece antes de ampliar sua seleção."
    >
      <section className={panelCard} aria-labelledby="store-brand-send">
        <h2 id="store-brand-send" className="text-title font-semibold">
          Marca na Shopee
        </h2>
        <p className="text-body text-muted-foreground">
          O nome, o logo e a descrição confirmados são enviados automaticamente quando a conexão e o
          envio da marca estão liberados. Os banners são aplicados por você na Shopee.
        </p>
        <form action={sendStoreBrand}>
          {brandPublicationEnabled() ? (
            <Button variant="soft">Conferir preparação do envio</Button>
          ) : (
            <p className="text-body text-muted-foreground">
              O envio estará disponível quando a conexão e as alterações estiverem liberadas para
              sua loja.
            </p>
          )}
        </form>
        <Button asChild variant="soft">
          <Link href="/loja-pronta/marca/publication">Conferir e confirmar minha marca</Link>
        </Button>
        <Button asChild variant="soft">
          <Link href="/loja-pronta/marca/banners">Ver meus banners</Link>
        </Button>
        {!brand.publicationFingerprint ? (
          <p className="text-body text-muted-foreground">
            Confirme sua marca atual para autorizar o envio automático.
          </p>
        ) : null}
        {operations.brandJobs.length ? (
          <ul className="space-y-3">
            {operations.brandJobs.map((job) => (
              <li key={job.id} className="rounded-2xl border border-border p-4 text-body">
                {job.status === 'completed'
                  ? 'Marca enviada.'
                  : job.status === 'unknown'
                    ? 'Resultado a conferir na Shopee.'
                    : job.status === 'blocked'
                      ? 'Não foi possível enviar a marca. Confira a conexão e os dados.'
                      : 'Envio em andamento.'}
                {job.status === 'blocked' &&
                job.sourceFingerprint === brand.publicationFingerprint &&
                brandPublicationEnabled() ? (
                  <form action={retryBrandPublication}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button variant="soft">Tentar envio da marca novamente</Button>
                  </form>
                ) : null}
                {job.status === 'unknown' ? (
                  <form action={checkBrandChange}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button variant="soft">Conferir envio da marca</Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {result === 'brand-approved' ? (
        <output className="text-body text-progress-text">
          Marca confirmada. O envio será preparado automaticamente quando a conexão e o recurso
          estiverem liberados.
        </output>
      ) : null}
      {result === 'brand-queued' || result === 'brand-unavailable' ? (
        <output className="text-body">
          {result === 'brand-queued'
            ? 'Preparação da marca conferida. Acompanhe o resultado em Marca na Shopee.'
            : 'Não foi possível preparar o envio da marca. Confira se ela está confirmada e se a conexão está disponível.'}
        </output>
      ) : null}
      {configuredSupplierSources().length ? (
        <section className={panelCard} aria-labelledby="supplier-sync">
          <h2 id="supplier-sync" className="text-title font-semibold">
            Catálogo atualizado
          </h2>
          <form action={subscribeSupplierFeed} className="space-y-4">
            <label htmlFor="supplier-feed" className="text-body">
              Fornecedor
            </label>
            <SelectMenu id="supplier-feed" name="supplierId">
              {configuredSupplierSources().map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </SelectMenu>
            <Button variant="soft">Ativar atualização dos produtos</Button>
          </form>
          {operations.feeds.map((feed) => (
            <p key={feed.supplierId} className="text-body text-muted-foreground">
              {configuredSupplierSources().find((source) => source.id === feed.supplierId)?.name ??
                'Fornecedor'}
              :{' '}
              {feed.failure
                ? 'não foi possível concluir a atualização.'
                : feed.updatedAt
                  ? `última consulta em ${date(feed.updatedAt)}.`
                  : 'aguardando a primeira atualização.'}
            </p>
          ))}
        </section>
      ) : null}
      {result && !result.startsWith('brand-') ? (
        <output className="text-body">
          {result === 'queued'
            ? 'Sua seleção foi salva. A publicação será acompanhada nesta página.'
            : result === 'invalid'
              ? 'Confira sua seleção e tente novamente.'
              : 'Não foi possível preparar a publicação. Confira a conexão, o preço e o estoque atualizados.'}
        </output>
      ) : null}
      {overview.batches.map((batch) => {
        const observation = batchObservationState(batch.publishedAt);
        const items = overview.items.filter((item) => item.batchId === batch.id);
        return (
          <section key={batch.id} className={panelCard} aria-labelledby={`batch-${batch.id}`}>
            <h2 id={`batch-${batch.id}`} className="text-title font-semibold">
              {batch.kind === 'initial' ? 'Seus cinco primeiros produtos' : 'Próximos produtos'}
            </h2>
            <p className="text-body text-muted-foreground">
              {batch.kind === 'expansion'
                ? batch.publishedAt
                  ? 'Todos os produtos deste lote foram confirmados na Shopee.'
                  : 'A publicação deste lote está em andamento. Confira a confirmação de cada produto abaixo.'
                : !batch.publishedAt
                  ? 'O acompanhamento de cinco dias começa quando todos os anúncios deste lote estiverem confirmados.'
                  : batch.status === 'evaluated'
                    ? 'Os cinco dias foram analisados com os dados disponíveis.'
                    : observation.status === 'observing'
                      ? `Período de observação até ${date(observation.readyAt!)}.`
                      : 'O período de cinco dias terminou. A análise aguarda coletas completas cobrindo esse intervalo.'}
            </p>
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-border p-4 text-body">
                  <strong>{item.payload.item_name}</strong>
                  <p className="text-muted-foreground">
                    {statusLabels[item.status]}
                    {item.itemId ? ` · Anúncio ${item.itemId}` : ''}
                  </p>
                </li>
              ))}
            </ul>
            {batch.analysis ? (
              <output className="text-body">{batch.analysis.message}</output>
            ) : null}
            {batch.analysis?.preferredCategoryId ? (
              <p className="text-body text-muted-foreground">
                Na próxima seleção, os produtos da categoria {batch.analysis.preferredCategoryId}{' '}
                aparecem identificados para você conferir.
              </p>
            ) : null}
          </section>
        );
      })}
      {overview.batches.length ? (
        <Button asChild variant="soft">
          <Link href="/loja-pronta/shopee/conectar">Conferir a conexão da Shopee</Link>
        </Button>
      ) : null}
      {corrections.length ? (
        <section className={panelCard} aria-labelledby="publication-corrections">
          <h2 id="publication-corrections" className="text-title font-semibold">
            Confira os produtos que aguardam nova confirmação
          </h2>
          <p className="text-body text-muted-foreground">
            Os anúncios já publicados continuam salvos. Confira os dados atuais antes de retomar
            cada item.
          </p>
          {corrections.map((item) => (
            <form
              key={item.itemId}
              action={confirmPublicationCorrection}
              className="space-y-3 rounded-2xl border border-border p-4"
            >
              <h3 className="text-body font-semibold">{item.title}</h3>
              <p className="text-body text-muted-foreground">
                Preço anterior:{' '}
                {item.previousPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                . Preço atual:{' '}
                {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
                Quantidade para publicar: {item.stock}.
              </p>
              <input type="hidden" name="itemId" value={item.itemId} />
              <input type="hidden" name="fingerprint" value={item.fingerprint} />
              <Button variant="soft">Confirmar dados atualizados e retomar</Button>
            </form>
          ))}
        </section>
      ) : null}
      {maySelect ? (
        <section className={panelCard} aria-labelledby="choose-products">
          <h2 id="choose-products" className="text-title font-semibold">
            {initial ? 'Escolha os próximos produtos' : 'Escolha cinco produtos diferentes'}
          </h2>
          {catalog.status === 'connection' ? (
            <>
              <p className="text-body text-muted-foreground">
                Confira a conexão da sua loja para consultar os produtos.
              </p>
              <Button asChild variant="soft">
                <Link href="/loja-pronta/shopee/conectar">Conferir conexão</Link>
              </Button>
            </>
          ) : catalog.status !== 'ready' || catalog.products.length < (initial ? 1 : 5) ? (
            <p className="text-body text-muted-foreground">
              O catálogo está em preparação. Os produtos aparecem quando o fornecedor disponibilizar
              informações atualizadas e a publicação estiver liberada para sua loja.
            </p>
          ) : (
            <form action={submitPublicationBatch} className="flex flex-col gap-5">
              <input type="hidden" name="kind" value={initial ? 'expansion' : 'initial'} />
              <label htmlFor="product-strategy" className="text-body">
                Como quer organizar sua seleção?
              </label>
              <SelectMenu id="product-strategy" name="strategy">
                <option value="varied">Produtos de categorias variadas</option>
                <option value="niche">Produtos do mesmo nicho</option>
              </SelectMenu>
              <fieldset className="space-y-3">
                <legend className="mb-3 text-body">
                  {initial
                    ? 'Selecione os produtos para ampliar seu catálogo.'
                    : 'Selecione exatamente cinco produtos.'}
                </legend>
                {catalog.products.map((product) => (
                  <label
                    key={JSON.stringify([product.supplierId, product.sku])}
                    aria-label={product.title}
                    className="flex min-h-12 items-start gap-3 rounded-2xl border border-border p-4"
                  >
                    <input
                      type="checkbox"
                      name="product"
                      value={JSON.stringify([product.supplierId, product.sku, product.fingerprint])}
                      className="mt-1 size-5 shrink-0"
                    />
                    <span className="text-body">
                      <strong>{product.title}</strong>
                      {product.variants.length ? (
                        <span className="block text-muted-foreground">
                          {product.variants
                            .map(
                              (variant) =>
                                `${Object.values(variant.options).join(' / ')}: ${(variant.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, ${variant.stock} disponíveis`,
                            )
                            .join('; ')}
                        </span>
                      ) : null}
                      <span className="block text-muted-foreground">
                        {(product.priceCents / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}{' '}
                        · {product.stock} disponíveis no fornecedor · {product.quantity} para
                        publicar
                        {initial?.analysis?.preferredCategoryId === product.categoryId
                          ? ' · Categoria em destaque na observação'
                          : ''}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <p className="text-body text-muted-foreground">
                Ao continuar, você autoriza a publicação dos produtos selecionados na sua loja
                conectada. O preço e o estoque serão conferidos novamente antes de cada envio.
              </p>
              <Button>Confirmar seleção e publicar</Button>
            </form>
          )}
        </section>
      ) : null}
      <Button asChild variant="soft">
        <Link href="/loja-pronta">Voltar para minha loja</Link>
      </Button>
    </AreaPage>
  );
}

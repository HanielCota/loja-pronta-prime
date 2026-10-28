import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Textarea } from '@/components/ui/textarea';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { importedProduct } from '@/features/legacy-stores/server/catalog-data';
import { recoveredPublication } from '@/features/legacy-stores/server/publication-data';
import {
  publicationLocked,
  recoveredPublicationMessages,
} from '@/features/legacy-stores/publication';
import { saveRecoveredCatalogReview } from '@/features/legacy-stores/server/catalog-actions';
import {
  RecoveredProductPhotos,
  RecoveredProductVariations,
} from '@/features/legacy-stores/components/recovered-product';

export const metadata: Metadata = { title: 'Revisar produto recuperado' };
export default async function ReviewRecoveredProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { id } = await params;
  const path = `/loja-pronta/produtos/recovered/${encodeURIComponent(id)}`;
  const { session, products } = await requireProduct('loja-pronta', path);
  const row = await importedProduct(db.$client, session.user.id, id);
  if (!row) notFound();
  const product = row.product;
  const publication = await recoveredPublication(db.$client, session.user.id, id);
  const locked = publication ? publicationLocked(publication.status) : false;
  const result = (await searchParams).resultado;
  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Revisar produto"
      title="Revisar produto recuperado"
    >
      <Button asChild variant="soft" size="inline" className="w-fit px-5">
        <Link href="/loja-pronta/produtos/recovered">Voltar à minha lista</Link>
      </Button>
      {result ? (
        <output className="rounded-2xl bg-primary-soft p-5 text-body">
          {result === 'saved'
            ? 'Revisão salva. Seu produto continua guardado na sua lista.'
            : 'O produto mudou em outra aba. Recarregue a página e confira os dados antes de salvar novamente.'}
        </output>
      ) : null}
      <section className={`${panelCard} gap-5`} aria-labelledby="review-product">
        <h2 id="review-product" className="text-title font-semibold">
          Confira os dados do produto
        </h2>
        <RecoveredProductPhotos product={product} />
        <form action={saveRecoveredCatalogReview} className="flex flex-col gap-5">
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-5">
            <input type="hidden" name="productId" value={id} />
            <input type="hidden" name="revision" value={row.revision} />
            <FloatingLabelInput
              id="title"
              name="title"
              label="Nome do produto"
              defaultValue={product.title}
              maxLength={120}
              required
            />
            <FloatingLabelInput
              id="price"
              name="price"
              label="Preço de venda (R$)"
              inputMode="decimal"
              defaultValue={(product.priceCents / 100).toFixed(2).replace('.', ',')}
              required
            />
            <label htmlFor="description" className="text-body font-semibold">
              Descrição
            </label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product.description}
              maxLength={5000}
              required
            />
            <Button>Salvar revisão</Button>
          </fieldset>
        </form>
        <RecoveredProductVariations product={product} />
        {publication ? (
          <output className="text-body">
            {recoveredPublicationMessages[publication.status]}
          </output>
        ) : null}
        <Button asChild>
          <Link href={`${path}/publish`}>
            {locked ? 'Acompanhar publicação' : 'Preparar publicação na Shopee'}
          </Link>
        </Button>
        <p className="text-body text-muted-foreground">
          Produto importado para revisão. A publicação na Shopee depende de confirmar a conexão, o
          estoque, o custo e o frete atuais.
        </p>
      </section>
    </AreaPage>
  );
}

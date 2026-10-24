import { randomUUID } from 'node:crypto';
import { userCloneOffers } from '@/features/assistant/server/listing-clones';
import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { storeAutomationJobs } from '@/server/db/schema';
import { SllPage } from '@/features/sll/sll-area-shell';
import { requireProduct } from '@/features/products/server/access';
import { readStoreObservations } from '@/features/assistant/server/metrics';
import { listingChangeOptions } from '@/features/assistant/server/change-options';
import {
  finishStoreExperiment,
  submitListingChanges,
  checkStoreChange,
  retryStoreChange,
} from '@/features/assistant/server/store-change-actions';
import { panelCard } from '@/features/member/components/area-shell';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Textarea } from '@/components/ui/textarea';
import { FileField } from '@/components/ui/file-field';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Ajustar anúncios · SLL' };
export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct('sll', '/sll/anuncios');
  const params = await searchParams;
  const selectedCategory = Number(getParam(params.categoria));
  const enabled = process.env.SHOPEE_PUBLICATION_ENABLED === 'true';
  const [data, options, jobs] = await Promise.all([
    readStoreObservations(session.user.id),
    (enabled
      ? listingChangeOptions(
          session.user.id,
          Number.isSafeInteger(selectedCategory) && selectedCategory > 0
            ? selectedCategory
            : undefined,
        )
      : Promise.resolve({ categories: [], attributes: [] })
    ).catch(() => ({ categories: [], attributes: [] })),
    db
      .select()
      .from(storeAutomationJobs)
      .where(
        and(
          eq(storeAutomationJobs.userId, session.user.id),
          sql`${storeAutomationJobs.kind} in ('edit','clone')`,
        ),
      )
      .orderBy(desc(storeAutomationJobs.createdAt))
      .limit(50),
  ]);
  const cloneOffers = enabled
    ? await userCloneOffers(
        session.user.id,
        data.items.map((item) => item.itemId),
      ).catch(() => [])
    : [];
  const cloneOfferSummaries = new Map(
    cloneOffers.map((offer) => [
      offer.itemId,
      [
        `${offer.payload.original_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${offer.payload.normal_stock} unidades no novo anúncio`,
        ...(offer.payload.variations?.model.map(
          (model) =>
            `${model.tier_index.map((value, index) => offer.payload.variations!.tier_variation[index]!.option_list[value]!.option).join(' / ')}: ${model.original_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, ${model.normal_stock} unidades`,
        ) ?? []),
      ].join('; '),
    ]),
  );
  const cloneIntent = randomUUID();
  const labels = {
    pending: 'Na fila',
    running: 'Em execução',
    completed: 'Concluído',
    blocked: 'Não foi possível aplicar',
    unknown: 'Resultado a conferir',
  };
  return (
    <SllPage
      hasChoice={products.length > 1}
      title="Ajustar anúncios"
      intro="Selecione os anúncios da sua loja e confira o que deseja alterar."
    >
      {getParam(params.resultado) ? (
        <output className="text-body">
          {getParam(params.resultado) === 'queued'
            ? 'Alterações salvas. Acompanhe o resultado abaixo.'
            : 'Não foi possível preparar as alterações. Confira os dados e a conexão.'}
        </output>
      ) : null}
      {!enabled ? (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            As alterações de anúncios estarão disponíveis quando a integração da sua loja estiver
            liberada.
          </p>
        </section>
      ) : data.items.length ? (
        <>
          <section className={panelCard} aria-labelledby="listing-category">
            <h2 id="listing-category" className="text-title font-semibold">
              Categoria dos anúncios
            </h2>
            <form method="get" className="space-y-4">
              <label htmlFor="edit-category" className="text-body">
                Categoria para usar
              </label>
              <Select
                id="edit-category"
                name="categoria"
                defaultValue={selectedCategory > 0 ? String(selectedCategory) : ''}
              >
                <option value="">Manter as categorias atuais</option>
                {options.categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.original_category_name}
                  </option>
                ))}
              </Select>
              <Button variant="soft">Conferir requisitos da categoria</Button>
            </form>
          </section>
          <section className={panelCard} aria-labelledby="listing-selection">
            <h2 id="listing-selection" className="text-title font-semibold">
              Escolha os anúncios e as alterações
            </h2>
            <form action={submitListingChanges} className="space-y-5">
              {cloneOffers.length ? (
                <>
                  <label htmlFor="listing-mode" className="text-body">
                    O que deseja fazer?
                  </label>
                  <Select id="listing-mode" name="mode">
                    <option value="edit">Alterar os anúncios selecionados</option>
                    <option value="clone">Criar novos anúncios para comparar</option>
                  </Select>
                  <input type="hidden" name="cloneIntent" value={cloneIntent} />
                  {cloneOffers.map((offer) => (
                    <input
                      key={offer.itemId}
                      type="hidden"
                      name="cloneOffer"
                      value={JSON.stringify([offer.itemId, offer.fingerprint])}
                    />
                  ))}
                  <p className="text-body text-muted-foreground">
                    Para criar novos anúncios, selecione produtos com valores exibidos abaixo e
                    preencha novo título, categoria e imagem. Os originais serão preservados.
                  </p>
                </>
              ) : null}
              <fieldset className="space-y-3">
                <legend className="mb-3 text-body">Anúncios da sua loja</legend>
                {data.items.slice(0, 200).map((item) => (
                  <label
                    key={item.itemId}
                    aria-label={item.title}
                    className="flex min-h-12 items-start gap-3 rounded-2xl border border-border p-4 text-body"
                  >
                    <input
                      type="checkbox"
                      name="itemId"
                      value={item.itemId}
                      className="mt-1 size-5 shrink-0"
                    />
                    <span>
                      {item.title}
                      {cloneOfferSummaries.has(item.itemId) ? (
                        <span className="block text-muted-foreground">
                          {cloneOfferSummaries.get(item.itemId)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </fieldset>
              <FloatingLabelInput
                id="listing-title"
                name="title"
                label="Novo título (opcional)"
                maxLength={120}
              />
              <label htmlFor="listing-description" className="flex flex-col gap-2 text-body">
                Nova descrição (opcional)
                <Textarea id="listing-description" name="description" maxLength={3000} />
              </label>
              <FileField
                id="listing-image"
                name="image"
                label="Substituir fotos por uma imagem (opcional)"
                accept="image/jpeg,image/png,image/webp"
              />
              <p className="text-body text-muted-foreground">
                A imagem escolhida substituirá as fotos dos anúncios selecionados.
              </p>
              {selectedCategory > 0 ? (
                <input type="hidden" name="categoryId" value={selectedCategory} />
              ) : null}
              {options.attributes.map((attribute) => (
                <div key={attribute.attribute_id} className="flex flex-col gap-2 text-body">
                  {attribute.attribute_value_list.length ? (
                    <>
                      <label htmlFor={`attribute-${attribute.attribute_id}`}>
                        {attribute.original_attribute_name}
                        {attribute.is_mandatory ? ' (obrigatório)' : ''}
                      </label>
                      <Select
                        id={`attribute-${attribute.attribute_id}`}
                        name={`attribute-${attribute.attribute_id}`}
                        required={attribute.is_mandatory}
                      >
                        <option value="">Escolha</option>
                        {attribute.attribute_value_list.map((value) => (
                          <option key={value.value_id} value={value.value_id}>
                            {value.original_value_name}
                          </option>
                        ))}
                      </Select>
                    </>
                  ) : (
                    <FloatingLabelInput
                      id={`attribute-${attribute.attribute_id}`}
                      name={`attribute-${attribute.attribute_id}`}
                      label={attribute.original_attribute_name}
                      required={attribute.is_mandatory}
                      maxLength={500}
                    />
                  )}
                </div>
              ))}
              <label className="flex min-h-12 items-start gap-3 text-body">
                <input
                  type="checkbox"
                  name="confirmed"
                  value="true"
                  required
                  className="mt-1 size-5 shrink-0"
                />
                Conferi os anúncios selecionados e autorizo aplicar as alterações preenchidas.
              </label>
              <Button>Confirmar alterações</Button>
            </form>
          </section>
        </>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            Conecte sua loja e aguarde a coleta dos anúncios.
          </p>
          <Button asChild variant="soft">
            <Link href="/sll/minhas-lojas/conectar">Conectar minha loja</Link>
          </Button>
        </section>
      )}
      <section className={panelCard} aria-labelledby="listing-results">
        <h2 id="listing-results" className="text-title font-semibold">
          Resultado das alterações
        </h2>
        {jobs.length ? (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-2xl border border-border p-4 text-body">
                Anúncio {String(job.payload.item_id)} · {labels[job.status]}
                {job.status === 'unknown' ? (
                  <>
                    <form action={checkStoreChange}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <Button variant="soft">Conferir resultado na Shopee</Button>
                    </form>
                    {job.kind === 'clone' &&
                    (job.payload.template as { variations?: unknown } | undefined)?.variations ? (
                      <form action={finishStoreExperiment}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button variant="soft">Ativar anúncio com variações confirmadas</Button>
                      </form>
                    ) : null}
                  </>
                ) : job.status === 'blocked' ? (
                  <form action={retryStoreChange}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button variant="soft">Tentar aplicar novamente</Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma alteração solicitada.</p>
        )}
      </section>
      <Button asChild variant="soft">
        <Link href="/sll/comparar-categorias">Voltar para comparar categorias</Link>
      </Button>
    </SllPage>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { SHOPEE_SELLER_URL } from '@/config/shopee';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { SelectMenu } from '@/components/ui/select-menu';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { canUseShopee } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { hasShopeeConnection } from '@/features/shopee/server/connection';
import { importedProduct } from '@/features/legacy-stores/server/catalog-data';
import { recoveredPublication } from '@/features/legacy-stores/server/publication-data';
import { recoveredPublicationEnabled } from '@/features/legacy-stores/server/publication-runtime';
import {
  startRecoveredPublication,
  reviewRecoveredPublicationAction,
  confirmRecoveredPublicationAction,
} from '@/features/legacy-stores/server/publication-actions';
import { RecoveredBarcodeFields } from '@/features/legacy-stores/components/recovered-barcode-fields';
import {
  recoveredPublicationMessages,
  activeRecoveredAttributes,
} from '@/features/legacy-stores/publication';
import { RecoveredProductPhotos } from '@/features/legacy-stores/components/recovered-product';

export const metadata: Metadata = { title: 'Publicar produto recuperado' };
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (value: number) => (value / 100).toFixed(2).replace('.', ',');
const checkboxLabel = 'flex min-h-11 cursor-pointer items-center gap-3 text-body';

export default async function PublishRecoveredProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { id } = await params;
  const path = `/loja-pronta/produtos/recovered/${encodeURIComponent(id)}`;
  const { session, products } = await requireProduct('loja-pronta', `${path}/publish`);
  const imported = await importedProduct(db.$client, session.user.id, id);
  if (!imported) notFound();
  const row = await recoveredPublication(db.$client, session.user.id, id);
  const config = getShopeeConfiguration();
  const enabled =
    recoveredPublicationEnabled() &&
    config?.SHOPEE_ENVIRONMENT === 'live' &&
    canUseShopee(config, session.user.id, session.user.role);
  const connected = enabled && config ? await hasShopeeConnection(session.user.id, config) : false;
  const result = (await searchParams).resultado;
  const product = imported.product;
  const offer = row?.intent?.offer;
  const expired =
    !row?.expires_at || row.review_expired || row.intent?.revision !== imported.revision;
  const context = row?.context;
  const valueFor = (name: string) => context?.values?.[name]?.[0] ?? '';
  const reviewAttributes = context
    ? activeRecoveredAttributes(context, (attributeId) => valueFor(`attribute-${attributeId}`))
    : [];
  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Publicar produto"
      title={row?.status === 'review' ? 'Confira antes de publicar' : 'Publicar na Shopee'}
    >
      <Button asChild variant="soft" size="inline" className="w-fit px-5">
        <Link href={path}>Voltar ao produto</Link>
      </Button>
      {result && ['unavailable', 'invalid', 'expired'].includes(result) ? (
        <output className="rounded-2xl bg-primary-soft p-5 text-body">
          {result === 'invalid'
            ? 'Confira os campos. Informe o custo, o preço e o estoque de cada opção. O preço precisa ser maior que o custo, e as variações precisam ter todas as combinações. Confirme os dados atuais antes de continuar.'
            : result === 'expired'
              ? 'A revisão venceu, o produto mudou ou a loja foi trocada. Prepare uma nova revisão antes de confirmar.'
              : 'Não foi possível consultar a Shopee. Confira a conexão da loja e tente novamente.'}
        </output>
      ) : null}
      <section className={`${panelCard} gap-5`} aria-labelledby="publication-status">
        <h2 id="publication-status" className="text-title font-semibold">
          {row?.status === 'review' ? 'Revise o resumo do envio' : 'Situação da publicação'}
        </h2>
        <p className="text-body">
          {row ? recoveredPublicationMessages[row.status] : 'Prepare seu produto para publicar.'}
        </p>
        {row?.status === 'blocked' && row.failure === 'duplicate' ? (
          <p className="text-body">
            Este produto já tem um anúncio nesta loja. Confira na Central do Vendedor para evitar
            uma cópia.
          </p>
        ) : null}
        {context ? (
          <p className="text-body">
            Loja de destino: <strong className="wrap-anywhere">{context.shopName}</strong> ·{' '}
            {row?.shop_id}
          </p>
        ) : null}
        {!enabled ? (
          <p className="text-body text-muted-foreground">
            Publicação em breve. Seus produtos continuam salvos para revisão.
          </p>
        ) : !connected ? (
          <>
            <p className="text-body">
              Conecte a loja que receberá o produto. Depois, volte aqui para revisar o envio.
            </p>
            <Button asChild>
              <Link href="/loja-pronta/produtos/recovered/connect">Conectar minha loja</Link>
            </Button>
          </>
        ) : null}
        {enabled && connected && (!row || row.status === 'blocked') ? (
          <form action={startRecoveredPublication}>
            <input type="hidden" name="productId" value={id} />
            <p className="mb-4 text-body text-muted-foreground">
              Consulte as categorias e os fretes da sua loja. Depois, informe os dados atuais do
              fornecedor e confira o resumo.
            </p>
            <Button>Preparar publicação</Button>
          </form>
        ) : null}
        {row && ['pending', 'preparing', 'sending', 'unknown', 'published'].includes(row.status) ? (
          <>
            <p className="text-body font-semibold wrap-anywhere">{offer?.title ?? product.title}</p>
            {row.item_id ? <p className="text-body">Número do anúncio: {row.item_id}</p> : null}
            <Button asChild variant="soft">
              <a href={SHOPEE_SELLER_URL} target="_blank" rel="noreferrer">
                Abrir a Central do Vendedor<span className="sr-only"> (abre em outra aba)</span>
              </a>
            </Button>
            <Button asChild variant="soft">
              <Link href={`${path}/publish`}>Atualizar situação</Link>
            </Button>
          </>
        ) : null}
      </section>
      {enabled && connected && row?.status === 'editing' && context ? (
        <>
          <section className={`${panelCard} gap-5`} aria-labelledby="category-title">
            <h2 id="category-title" className="text-title font-semibold">
              Categoria do produto
            </h2>
            <form action={startRecoveredPublication} className="flex flex-col gap-4">
              <input type="hidden" name="productId" value={id} />
              <label htmlFor="categoryId" className="text-body">
                Escolha a categoria que descreve seu produto
              </label>
              <SelectMenu
                id="categoryId"
                name="categoryId"
                defaultValue={String(context.categoryId ?? '')}
                required
              >
                <option value="">Escolha uma categoria</option>
                {context.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectMenu>
              <Button variant="soft">Conferir categoria</Button>
            </form>
          </section>
          {context.unsupported?.length ? (
            <output className="rounded-2xl bg-primary-soft p-5 text-body">
              {context.unsupported.join(' ')}
            </output>
          ) : null}
          {context.categoryId && !context.unsupported?.length ? (
            <section className={`${panelCard} gap-5`} aria-labelledby="current-offer">
              <h2 id="current-offer" className="text-title font-semibold">
                Dados atuais para o envio
              </h2>
              <p className="text-body font-semibold wrap-anywhere">{product.title}</p>
              <p className="text-body text-muted-foreground">
                Consulte o fornecedor agora. Os valores abaixo são informados por você e não são
                atualizados automaticamente. A revisão vale por 15 minutos. Esta opção publica
                produtos novos. Confira também as taxas da Shopee no seu preço.
              </p>
              {context.problem ? (
                <output className="text-body text-destructive">{context.problem}</output>
              ) : null}
              <form action={reviewRecoveredPublicationAction} className="flex flex-col gap-5">
                <input type="hidden" name="productId" value={id} />
                <input type="hidden" name="publicationId" value={row.id} />
                <input type="hidden" name="revision" value={imported.revision} />
                <input type="hidden" name="optionsVersion" value={context.version} />
                {product.variants.length ? (
                  product.variants.map((variant, index) => (
                    <fieldset
                      key={variant.sku}
                      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-5"
                    >
                      <legend className="px-2 text-body font-semibold wrap-anywhere">
                        {Object.entries(variant.options)
                          .map(([name, value]) => `${name}: ${value}`)
                          .join(' / ')}
                      </legend>
                      <FloatingLabelInput
                        id={`cost-${index}`}
                        name={`cost-${index}`}
                        defaultValue={valueFor(`cost-${index}`)}
                        label="Custo atual (R$)"
                        inputMode="decimal"
                        required
                      />
                      <FloatingLabelInput
                        id={`price-${index}`}
                        name={`price-${index}`}
                        label="Preço de venda (R$)"
                        defaultValue={valueFor(`price-${index}`) || money(product.priceCents)}
                        inputMode="decimal"
                        required
                      />
                      <RecoveredBarcodeFields index={index} context={context} />
                      <FloatingLabelInput
                        id={`stock-${index}`}
                        name={`stock-${index}`}
                        defaultValue={valueFor(`stock-${index}`)}
                        label="Estoque atual (unidades)"
                        type="number"
                        min={0}
                        max={1000000}
                        step={1}
                        required
                      />
                    </fieldset>
                  ))
                ) : (
                  <>
                    <p className="text-body">
                      Preço de venda: {currency.format(product.priceCents / 100)}. Para mudar, volte
                      ao produto e salve sua revisão.
                    </p>
                    <FloatingLabelInput
                      id="cost"
                      name="cost"
                      label="Custo atual (R$)"
                      defaultValue={valueFor('cost')}
                      inputMode="decimal"
                      required
                    />
                    <RecoveredBarcodeFields index={0} context={context} />
                    <FloatingLabelInput
                      id="stock"
                      name="stock"
                      label="Estoque atual (unidades)"
                      defaultValue={valueFor('stock')}
                      type="number"
                      min={1}
                      max={1000000}
                      step={1}
                      required
                    />
                  </>
                )}
                <fieldset className="flex min-w-0 flex-col gap-4">
                  <legend className="mb-4 text-body font-semibold">Pacote pronto para envio</legend>
                  <FloatingLabelInput
                    id="weightGrams"
                    name="weightGrams"
                    defaultValue={valueFor('weightGrams')}
                    label="Peso com embalagem (gramas)"
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    required
                  />
                  {(['length', 'width', 'height'] as const).map((name, index) => (
                    <FloatingLabelInput
                      key={name}
                      id={name}
                      name={name}
                      defaultValue={valueFor(name)}
                      label={`${['Comprimento', 'Largura', 'Altura'][index]} (cm)`}
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      required
                    />
                  ))}
                </fieldset>
                <label htmlFor="brandId" className="text-body font-semibold">
                  Marca do produto
                </label>
                <SelectMenu id="brandId" name="brandId" defaultValue={valueFor('brandId')} required>
                  <option value="">Escolha a marca</option>
                  {context.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </SelectMenu>
                {reviewAttributes.map((attribute) => (
                  <div key={attribute.id} className="flex flex-col gap-3">
                    {attribute.supported === false ? (
                      <p className="text-body">
                        {attribute.name}: esta característica exige preenchimento na Central do
                        Vendedor.
                      </p>
                    ) : attribute.values.length ? (
                      <>
                        <label htmlFor={`attribute-${attribute.id}`} className="text-body">
                          {attribute.name}
                          {attribute.mandatory ? ' (obrigatório)' : ' (opcional)'}
                        </label>
                        <SelectMenu
                          id={`attribute-${attribute.id}`}
                          name={`attribute-${attribute.id}`}
                          defaultValue={valueFor(`attribute-${attribute.id}`)}
                          required={attribute.mandatory}
                        >
                          <option value="">Escolha uma opção</option>
                          {attribute.values.map((value) => (
                            <option key={value.id} value={value.id}>
                              {value.name}
                            </option>
                          ))}
                        </SelectMenu>
                      </>
                    ) : (
                      <FloatingLabelInput
                        id={`attribute-${attribute.id}`}
                        name={`attribute-${attribute.id}`}
                        defaultValue={valueFor(`attribute-${attribute.id}`)}
                        label={`${attribute.name}${attribute.mandatory ? ' (obrigatório)' : ' (opcional)'}`}
                        maxLength={500}
                        required={attribute.mandatory}
                      />
                    )}
                  </div>
                ))}
                <fieldset className="flex min-w-0 flex-col gap-3">
                  <legend className="mb-3 text-body font-semibold">
                    Fretes disponíveis na sua loja
                  </legend>
                  {context.channels.map((channel) => (
                    <label key={channel.id} className={checkboxLabel}>
                      <input
                        type="checkbox"
                        name="channelId"
                        value={channel.id}
                        defaultChecked={context.values?.channelId?.includes(String(channel.id))}
                      />
                      {channel.name}
                    </label>
                  ))}
                  <p className="text-body text-muted-foreground">
                    Escolha pelo menos um frete. Este envio não ativa frete grátis. As taxas e os
                    programas da Shopee seguem a configuração da sua loja.
                  </p>
                </fieldset>
                <label className={checkboxLabel}>
                  <input type="checkbox" name="currentData" value="confirmed" required />
                  Este produto é novo. Conferi os custos, o estoque e o pacote com meu fornecedor
                  agora.
                </label>
                <Button
                  disabled={reviewAttributes.some(
                    (attribute) => attribute.mandatory && attribute.supported === false,
                  )}
                >
                  Revisar envio
                </Button>
              </form>
            </section>
          ) : null}
        </>
      ) : null}
      {row?.status === 'review' && offer && context ? (
        <section className={`${panelCard} gap-5`} aria-labelledby="final-review">
          <h2 id="final-review" className="text-title font-semibold">
            {offer.title}
          </h2>
          <RecoveredProductPhotos product={product} />
          <p className="text-body wrap-anywhere whitespace-pre-wrap">{offer.description}</p>
          <dl className="space-y-3 text-body">
            <div>
              <dt className="font-semibold">Condição</dt>
              <dd>Novo</dd>
            </div>
            <div>
              <dt className="font-semibold">Categoria</dt>
              <dd>
                {
                  context.categories.find(
                    (category) => category.id === offer.marketplace?.categoryId,
                  )?.name
                }
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Marca</dt>
              <dd>
                {context.brands.find((brand) => brand.id === offer.marketplace?.brandId)?.name}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Embalagem</dt>
              <dd>
                {offer.weightGrams} g · {offer.dimensionsCm.length} × {offer.dimensionsCm.width} ×{' '}
                {offer.dimensionsCm.height} cm
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Frete</dt>
              <dd>
                {context.channels
                  .filter((channel) => offer.marketplace?.logisticIds?.includes(channel.id))
                  .map((channel) => channel.name)
                  .join(', ')}{' '}
                · sem ativar frete grátis neste envio
              </dd>
            </div>
            {offer.marketplace?.attributes.map((attribute) => (
              <div key={attribute.id}>
                <dt className="font-semibold">
                  {context.attributes.find((definition) => definition.id === attribute.id)?.name}
                </dt>
                <dd>{attribute.values.map((value) => value.name).join(', ')}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-4 text-body">
            {(offer.variants.length ? offer.variants : [offer]).map((variant) => (
              <li key={variant.sku} className="rounded-2xl bg-muted p-4">
                {'options' in variant ? (
                  <p className="font-semibold">
                    {Object.entries(variant.options)
                      .map(([name, value]) => `${name}: ${value}`)
                      .join(' / ')}
                  </p>
                ) : null}
                <p>
                  Venda: {currency.format(variant.priceCents / 100)} · custo:{' '}
                  {currency.format(variant.costCents / 100)}
                </p>
                <p>Estoque: {variant.stock} unidades</p>
                <p>
                  Código de barras:{' '}
                  {row.intent?.barcodes?.[variant.sku] === '00'
                    ? 'Sem código, conforme informado por você'
                    : row.intent?.barcodes?.[variant.sku] ||
                      'Não informado (opcional nesta categoria)'}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-body text-muted-foreground">
            A publicação cria um novo anúncio nesta loja. Depois do envio, alterações devem ser
            feitas na Central do Vendedor.
          </p>
          {expired ? (
            <output className="text-body">
              Esta revisão venceu ou o produto foi alterado. Prepare uma nova revisão.
            </output>
          ) : (
            <p className="text-body">
              Confirme até{' '}
              {row.expires_at!.toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              (horário de Brasília).
            </p>
          )}
          {enabled && connected && !expired ? (
            <form action={confirmRecoveredPublicationAction} className="flex flex-col gap-5">
              <input type="hidden" name="productId" value={id} />
              <input type="hidden" name="fingerprint" value={row.fingerprint ?? ''} />
              <label className={checkboxLabel}>
                <input type="checkbox" name="confirmation" value="confirmed" required />
                Revisei as fotos, a condição, as variações, os preços, o estoque e o frete. Autorizo
                publicar este produto na loja {context.shopName}.
              </label>
              <Button>Confirmar e publicar na Shopee</Button>
            </form>
          ) : null}
          {enabled && connected ? (
            <form action={startRecoveredPublication}>
              <input type="hidden" name="productId" value={id} />
              <Button variant="soft">Voltar aos dados e revisar novamente</Button>
            </form>
          ) : null}
        </section>
      ) : null}
    </AreaPage>
  );
}

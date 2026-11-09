import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { brandStepPath } from '@/features/brand/steps';
import {
  deliveryApprovalFingerprint,
  shopeeDeliveryShopUrl,
} from '@/features/loja-pronta/assisted-delivery';
import { ASSISTED_DELIVERY_PATH } from '@/features/loja-pronta/delivery-paths';
import {
  assistedDeliveryReview,
  deliveryConfiguration,
  deliveryReadiness,
  newAssistedDeliveryPilot,
  ownAssistedDelivery,
} from '@/features/loja-pronta/server/assisted-delivery';
import {
  cancelOwnAssistedDelivery,
  submitAssistedDelivery,
} from '@/features/loja-pronta/server/assisted-delivery-actions';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Entrega da minha loja' };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function AssistedDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct('loja-pronta', ASSISTED_DELIVERY_PATH);
  const [delivery, phase] = await Promise.all([
    ownAssistedDelivery(session.user.id),
    getStorePhase(session.user.id),
  ]);
  if (!delivery && phase !== 4) redirect('/loja-pronta');
  const config = newAssistedDeliveryPilot();
  const enabled = phase === 4 && config?.userId === session.user.id;
  const requestedReview = delivery?.offerReviewId ? delivery : undefined;
  const reviewConfig = requestedReview ? deliveryConfiguration() : enabled ? config : null;
  const shopId = requestedReview?.shopId ?? config?.shopId;
  const readiness = delivery && !delivery.startedAt ? await deliveryReadiness(delivery) : null;
  const needsReview = enabled && (!delivery || readiness === 'brand' || readiness === 'offers');
  const review =
    requestedReview || needsReview
      ? await assistedDeliveryReview(session.user.id, requestedReview)
      : null;
  const result = getParam((await searchParams).resultado);

  return (
    <AreaPage
      area="loja-pronta"
      hasChoice={products.length > 1}
      crumb="Entrega"
      title="Entrega da minha loja"
      intro="Acompanhe a aplicação da sua marca e a publicação dos primeiros anúncios."
    >
      {result === 'invalid' || result === 'unavailable' ? (
        <p role="alert" className="text-body text-destructive">
          {result === 'invalid'
            ? 'Confira o link da sua loja na Shopee e tente de novo.'
            : 'A entrega ainda não pôde ser solicitada. Atualize a página e confira os dados.'}
        </p>
      ) : null}
      {delivery ? (
        <section className={panelCard} aria-labelledby="delivery-status">
          <h2 id="delivery-status" className="text-title font-semibold">
            {delivery.completedAt
              ? 'Sua loja está pronta'
              : requestedReview
                ? 'Aguardando sua aprovação'
                : delivery.startedAt
                  ? 'Publicação em andamento'
                  : 'Entrega solicitada'}
          </h2>
          <p className="text-body text-muted-foreground">
            {delivery.completedAt
              ? 'Sua marca foi aplicada e os cinco primeiros anúncios foram confirmados na Shopee.'
              : requestedReview
                ? 'Os anúncios confirmados foram preservados. Confira os produtos que ainda precisam ser publicados.'
                : delivery.startedAt
                  ? `${delivery.itemIds.filter(Boolean).length} de 5 anúncios confirmados na Shopee.`
                  : readiness === 'brand' || readiness === 'offers'
                    ? 'A marca ou os produtos mudaram. Confira os dados atuais antes de atualizar sua aprovação.'
                    : 'O próximo passo é conferir o acesso à sua loja na Shopee.'}
          </p>
          {delivery.completedAt ? (
            <Button asChild variant="soft">
              <a href={shopeeDeliveryShopUrl(delivery.shopId)}>Ver minha loja na Shopee</a>
            </Button>
          ) : !delivery.startedAt ? (
            <form action={cancelOwnAssistedDelivery}>
              <Button variant="ghost">Cancelar solicitação</Button>
            </form>
          ) : null}
        </section>
      ) : null}
      {!delivery && !enabled ? (
        <p className={`${panelCard} text-body text-muted-foreground`}>
          A entrega assistida estará disponível em breve.
        </p>
      ) : null}
      {review && !review.brand ? (
        <section className={panelCard}>
          <h2 className="text-title font-semibold">Confirme sua marca</h2>
          <p className="text-body text-muted-foreground">
            Revise o nome, o logo e a descrição que você personalizou.
          </p>
          <Button asChild>
            <Link href={brandStepPath('revisao')}>Revisar minha marca</Link>
          </Button>
        </section>
      ) : null}
      {review?.brand && review.offers.length !== review.count ? (
        <section className={panelCard}>
          <h2 className="text-title font-semibold">Produtos em preparação</h2>
          <p className="text-body text-muted-foreground">
            {requestedReview
              ? 'A revisão abre quando houver produtos suficientes com preço, estoque e fotos prontos.'
              : 'Sua marca está salva. A solicitação abre quando houver cinco produtos com preço, estoque e fotos prontos.'}
          </p>
        </section>
      ) : null}
      {reviewConfig && shopId && review?.brand && review.offers.length === review.count ? (
        <section className={panelCard} aria-labelledby="delivery-review">
          <h2 id="delivery-review" className="text-title font-semibold">
            {requestedReview
              ? 'Confira os produtos restantes'
              : 'Confira seus cinco primeiros produtos'}
          </h2>
          <p className="text-body text-muted-foreground">
            A publicação usa o nome, o logo e a descrição que você confirmou para{' '}
            {review.brand.name}.
          </p>
          <ul className="divide-y divide-border">
            {review.offers.map((offer) => (
              <li
                key={offer.sku}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-body"
              >
                <span className="wrap-anywhere">{offer.title}</span>
                <span className="text-muted-foreground">
                  {money.format(offer.priceCents / 100)}
                </span>
              </li>
            ))}
          </ul>
          <form action={submitAssistedDelivery} className="flex flex-col gap-4">
            <input
              type="hidden"
              name="approval"
              value={deliveryApprovalFingerprint(
                review.brand.fingerprint,
                review.offers,
                requestedReview?.offerReviewId ?? undefined,
              )}
            />
            <p className="text-body text-muted-foreground">
              Na Central do Vendedor, libere uma subconta para{' '}
              <strong>{reviewConfig.subaccount}</strong>, com acesso ao perfil e aos produtos.
              Mantenha sua senha com você.
            </p>
            <FloatingLabelInput
              id="delivery-shop-url"
              name="shopUrl"
              label="Link público da sua loja"
              type="url"
              maxLength={200}
              readOnly
              aria-describedby="delivery-shop-help"
              defaultValue={shopeeDeliveryShopUrl(shopId)}
            />
            <p id="delivery-shop-help" className="text-sm text-muted-foreground">
              Este é o link da loja escolhida para o teste.
            </p>
            <Button>
              {delivery ? 'Atualizar minha aprovação' : 'Aprovar e solicitar entrega'}
            </Button>
          </form>
        </section>
      ) : null}
    </AreaPage>
  );
}

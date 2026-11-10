import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { hasAdminRole } from '@/features/admin/access';
import { shopeeDeliveryShopUrl } from '@/features/loja-pronta/assisted-delivery';
import { DELIVERY_QUEUE_PATH } from '@/features/loja-pronta/delivery-paths';
import {
  deliveryReadiness,
  deliveryReconciliationFingerprint,
  eligibleDelivery,
} from '@/features/loja-pronta/server/assisted-delivery';
import {
  saveAssistedDeliveryItems,
  startAssistedDelivery,
  recoverAssistedDelivery,
} from '@/features/loja-pronta/server/assisted-delivery-actions';
import { panelCard } from '@/features/member/components/area-shell';
import { requireStaff } from '@/features/staff/server/staff-guard';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Entrega da loja' };

export default async function DeliveryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { user } = await requireStaff(`${DELIVERY_QUEUE_PATH}/${id}`, 'stores.deliver');
  if (!z.uuid().safeParse(id).success) notFound();
  const delivery = await eligibleDelivery(id);
  if (!delivery) notFound();
  const ready = delivery.completedAt ? null : await deliveryReadiness(delivery);
  const owner = delivery.operatorId === user.id;
  const confirmed = delivery.itemIds.filter(Boolean).length;
  const reconciliation = deliveryReconciliationFingerprint(delivery);
  const canRecover =
    hasAdminRole(user.role) &&
    delivery.startedAt &&
    !delivery.completedAt &&
    !delivery.offerReviewId;
  const result = getParam((await searchParams).resultado);
  const download = `${DELIVERY_QUEUE_PATH}/${id}/arquivo`;

  return (
    <AdminPage
      title={delivery.brand.name}
      intro="Entrega assistida na Shopee"
      backLink={{ href: DELIVERY_QUEUE_PATH, label: 'Entregas de lojas' }}
    >
      {result === 'unavailable' || result === 'invalid' ? (
        <p role="alert" className="text-body text-destructive">
          {result === 'unavailable'
            ? 'Não foi possível assumir a entrega. Confira o modelo da Shopee e se a entrega ainda está disponível.'
            : 'Confira os números dos anúncios. Cada produto precisa ter um número diferente.'}
        </p>
      ) : null}
      {result === 'recovery-unavailable' ? (
        <p role="alert" className="text-body text-destructive">
          A entrega mudou. Confira os anúncios na Shopee antes de tentar de novo.
        </p>
      ) : null}
      {result === 'recovered' ? (
        <output className="block text-body">Entrega atualizada.</output>
      ) : null}
      <section className={panelCard} aria-labelledby="delivery-brand">
        <h2 id="delivery-brand" className="text-title font-semibold">
          Marca aprovada pela cliente
        </h2>
        <p className="text-body wrap-anywhere">{delivery.brand.description}</p>
        <Button asChild variant="soft">
          <a href={shopeeDeliveryShopUrl(delivery.shopId)}>Abrir loja na Shopee</a>
        </Button>
        {owner && !delivery.completedAt ? (
          <Button asChild variant="soft">
            <a href={`${download}?tipo=logo`}>Baixar logo aprovado</a>
          </Button>
        ) : null}
      </section>
      <section className={panelCard} aria-labelledby="delivery-batch">
        <h2 id="delivery-batch" className="text-title font-semibold">
          {delivery.completedAt ? 'Entrega concluída' : 'Primeiro lote de produtos'}
        </h2>
        <p className="text-body text-muted-foreground">
          {confirmed} de 5 anúncios confirmados na Shopee.
        </p>
        {ready === 'template' || ready === 'brand' || (ready === 'offers' && confirmed < 5) ? (
          <p className="text-body text-muted-foreground">
            {ready === 'template'
              ? 'A configuração do modelo de importação está pendente.'
              : ready === 'brand'
                ? 'A cliente precisa confirmar a marca atual.'
                : 'Um ou mais produtos ficaram desatualizados. Confira a situação na Shopee antes de continuar.'}
          </p>
        ) : null}
        {ready === 'review' ? (
          <p className="text-body text-muted-foreground">
            Aguardando a aprovação da cliente para os produtos restantes.
          </p>
        ) : null}
        {!delivery.operatorId && ready === 'ready' ? (
          <form action={startAssistedDelivery} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={id} />
            <label className="flex min-h-11 items-center gap-3 text-body">
              <input type="checkbox" name="access" value="confirmed" required />
              Conferi a loja e tenho permissão para editar o perfil e publicar produtos.
            </label>
            <Button>Assumir entrega</Button>
          </form>
        ) : null}
        {delivery.operatorId && !owner && !delivery.completedAt ? (
          <p className="text-body text-muted-foreground">
            Outro atendente está cuidando desta entrega.
          </p>
        ) : null}
        {(owner || canRecover) && !delivery.completedAt ? (
          <>
            {owner && ready === 'ready' && confirmed < 5 ? (
              <>
                <p className="text-body text-muted-foreground">
                  Use a planilha em Adicionar em Massa. Em caso de envio parcial, confira os códigos
                  na Shopee e salve os anúncios ativos antes de baixar de novo.
                </p>
                <Button asChild>
                  <a href={download}>
                    {confirmed ? 'Baixar anúncios restantes' : 'Baixar planilha dos cinco produtos'}
                  </a>
                </Button>
              </>
            ) : null}
            <form action={saveAssistedDeliveryItems} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="reconciliation" value={reconciliation} />
              {delivery.selection.map(({ sku }, index) => (
                <div key={sku}>
                  <p className="mb-2 text-body font-semibold wrap-anywhere">
                    Código do produto {sku}
                  </p>
                  {delivery.itemIds[index] ? (
                    <p className="text-body text-muted-foreground">
                      Anúncio confirmado {delivery.itemIds[index]}
                    </p>
                  ) : (
                    <FloatingLabelInput
                      id={`delivery-item-${index}`}
                      name={`item-${index}`}
                      label={`Número do anúncio ativo ${index + 1}`}
                      inputMode="numeric"
                      pattern="[1-9][0-9]{0,15}"
                      maxLength={16}
                    />
                  )}
                </div>
              ))}
              <label className="flex min-h-11 items-center gap-3 text-body">
                <input type="checkbox" name="brand" value="confirmed" />
                Conferi que a marca aprovada está aplicada na Shopee.
              </label>
              <Button variant="soft">Salvar conferência</Button>
            </form>
          </>
        ) : null}
        {canRecover && (delivery.operatorId || ready === 'offers') ? (
          <form action={recoverAssistedDelivery} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="reconciliation" value={reconciliation} />
            <label className="flex min-h-11 items-center gap-3 text-body">
              <input type="checkbox" name="reconciled" value="yes" required />
              Conferi os anúncios na Shopee. Todos os anúncios ativos desta entrega já estão
              registrados e não há envio em andamento.
            </label>
            {ready === 'offers' ? (
              <Button name="mode" value="review" variant="soft">
                Pedir nova aprovação dos produtos restantes
              </Button>
            ) : (
              <Button name="mode" value="release" variant="soft">
                Liberar para outro atendente
              </Button>
            )}
          </form>
        ) : null}
      </section>
    </AdminPage>
  );
}

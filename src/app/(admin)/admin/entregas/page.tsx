import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { DELIVERY_QUEUE_PATH } from '@/features/loja-pronta/delivery-paths';
import {
  listAssistedDeliveries,
  newAssistedDeliveryPilot,
} from '@/features/loja-pronta/server/assisted-delivery';
import { panelCard } from '@/features/member/components/area-shell';
import { requireStaff } from '@/features/staff/server/staff-guard';

export const metadata: Metadata = { title: 'Entregas de lojas' };

export default async function DeliveryQueuePage() {
  const { user } = await requireStaff(DELIVERY_QUEUE_PATH, 'stores.deliver');
  const deliveries = await listAssistedDeliveries();

  return (
    <AdminPage
      title="Entregas de lojas"
      intro="Confira o acesso, aplique a marca aprovada e publique os anúncios na Shopee."
    >
      {!newAssistedDeliveryPilot() ? (
        <p className={`${panelCard} text-body text-muted-foreground`}>
          Novas solicitações em breve. A abertura depende da configuração do modelo de importação e
          da subconta da Shopee.
        </p>
      ) : null}
      {!deliveries.length ? (
        <p className={`${panelCard} text-body text-muted-foreground`}>
          Nenhuma entrega solicitada.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {deliveries.map((delivery) => (
            <li key={delivery.id} className={panelCard}>
              <h2 className="text-title font-semibold wrap-anywhere">{delivery.brand.name}</h2>
              <p className="text-body text-muted-foreground">
                {delivery.completedAt
                  ? 'Entregue'
                  : delivery.operatorId === user.id
                    ? 'Em andamento com você'
                    : delivery.operatorId
                      ? 'Em andamento com outro atendente'
                      : 'Aguardando conferência do acesso'}
              </p>
              <Button asChild variant="soft">
                <Link href={`${DELIVERY_QUEUE_PATH}/${delivery.id}`}>Ver entrega</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { getAccountStoreJourney } from '@/features/admin/server/store-journey';
import { LegacyStoreDetail } from '@/features/legacy-stores/components/store-detail';
import { getLegacyStoreForUser } from '@/features/legacy-stores/server/queries';

export const metadata: Metadata = { title: 'Loja anterior · Administração' };

export default async function AdminPreviousStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; storeId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id, storeId } = await params;
  const { page: requestedPage } = await searchParams;
  const parsed = Number(requestedPage);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;
  const journey = await getAccountStoreJourney(id);
  if (!journey) notFound();
  const data = await getLegacyStoreForUser(journey.account.id, storeId, page);
  if (!data || (page > 1 && (page - 1) * 30 >= data.total)) notFound();
  const accountPath = `/admin/contas/${encodeURIComponent(id)}`;
  const basePath = `${accountPath}/previous-stores/${encodeURIComponent(storeId)}`;
  return (
    <AdminShell
      account={journey.session.user}
      current="accounts"
      backLink={{ href: `${accountPath}/etapa`, label: 'Voltar às lojas da aluna' }}
      title={data.record.nome || data.record.shopee_nome || 'Loja anterior'}
      intro={journey.account.email}
    >
      <LegacyStoreDetail
        store={data.record}
        linked={data.linked}
        products={data.products}
        total={data.total}
        purchases={data.purchases}
        page={page}
        basePath={basePath}
      />
    </AdminShell>
  );
}

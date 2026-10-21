import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaShell } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { LegacyStoreDetail } from '@/features/legacy-stores/components/store-detail';
import { getLegacyStoreForUser } from '@/features/legacy-stores/server/queries';

export const metadata: Metadata = { title: 'Previous store' };

export default async function PreviousStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: requestedPage } = await searchParams;
  const parsed = Number(requestedPage);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;
  const basePath = `/loja-pronta/previous-stores/${encodeURIComponent(id)}`;
  const { session, products } = await requireProduct('loja-pronta', basePath);
  const data = await getLegacyStoreForUser(session.user.id, id, page);
  if (!data || (page > 1 && (page - 1) * 30 >= data.total)) notFound();
  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Previous store"
      title={data.record.nome || data.record.shopee_nome || 'Previous store'}
    >
      <Button asChild variant="soft" size="inline" className="w-fit px-5">
        <Link href="/loja-pronta">
          <ArrowLeft aria-hidden="true" />
          Back to my stores
        </Link>
      </Button>
      <LegacyStoreDetail
        store={data.record}
        linked={data.linked}
        products={data.products}
        total={data.total}
        purchases={data.purchases}
        page={page}
        basePath={basePath}
      />
    </AreaShell>
  );
}

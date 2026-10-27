import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaPage } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { LegacyStoreDetail } from '@/features/legacy-stores/components/store-detail';
import {
  getLegacyStoreForUser,
  LEGACY_PRODUCTS_PAGE_SIZE,
} from '@/features/legacy-stores/server/queries';
import { recoveredStores } from '@/features/legacy-stores/server/catalog-data';
import { db } from '@/server/db';
import { parsePageNumber } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Loja anterior' };

export default async function PreviousStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: requestedPage } = await searchParams;
  const page = parsePageNumber(requestedPage);
  const basePath = `/loja-pronta/previous-stores/${encodeURIComponent(id)}`;
  const { session, products } = await requireProduct('loja-pronta', basePath);
  const data = await getLegacyStoreForUser(session.user.id, id, page);
  if (!data || (page > 1 && (page - 1) * LEGACY_PRODUCTS_PAGE_SIZE >= data.total)) notFound();
  const recovery = (await recoveredStores(db.$client, session.user.id)).find(
    (row) => row.id === (data.linked?.id ?? id),
  );
  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Loja anterior"
      title={data.record.nome || data.record.shopee_nome || 'Loja anterior'}
    >
      <Button asChild variant="soft" size="inline" className="w-fit px-5">
        <Link href="/loja-pronta">
          <ArrowLeft aria-hidden="true" />
          Voltar às minhas lojas
        </Link>
      </Button>
      {recovery ? (
        <Button asChild variant="soft" size="inline" className="w-fit px-5">
          <Link href={`/loja-pronta/previous-stores/${recovery.id}/import`}>
            Importar produtos recuperados
          </Link>
        </Button>
      ) : null}
      <LegacyStoreDetail
        store={data.record}
        linked={data.linked}
        products={data.products}
        total={data.total}
        purchases={data.purchases}
        page={page}
        basePath={basePath}
      />
    </AreaPage>
  );
}

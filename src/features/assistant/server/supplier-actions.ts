'use server';

import { runAsStudent } from '@/features/staff/server/impersonation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { supplierFeedSubscriptions } from '@/server/db/schema';
import { requireProductAction } from '@/features/products/server/access';
import { configuredSupplierSources } from '@/features/shopee/supplier-feed';
import { canUseShopee } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { getActiveShopeeConnection } from '@/features/shopee/server/connection';
import { canPrepareSupplierFeed, supplierPublicationPilot } from './supplier-publication-policy';

export async function subscribeSupplierFeed(form: FormData): Promise<void> {
  return runAsStudent('subscribeSupplierFeed', async () => {
    const { userId, session } = await requireProductAction('loja-pronta');
    if (!canPrepareSupplierFeed(userId)) {
      redirect('/loja-pronta/produtos?resultado=unavailable');
    }

    const supplierId = String(form.get('supplierId') ?? '');
    if (!configuredSupplierSources().some((source) => source.id === supplierId))
      redirect('/loja-pronta/produtos?resultado=invalid');

    if (supplierPublicationPilot()) {
      const config = getShopeeConfiguration();
      if (!config || !canUseShopee(config, userId, session.user.role)) {
        redirect('/loja-pronta/produtos?resultado=unavailable');
      }

      const connection = await getActiveShopeeConnection(userId, config);
      if (!connection || !canPrepareSupplierFeed(userId, connection.shopId)) {
        redirect('/loja-pronta/produtos?resultado=unavailable');
      }
    }

    await db
      .insert(supplierFeedSubscriptions)
      .values({ userId, supplierId })
      .onConflictDoUpdate({
        target: [supplierFeedSubscriptions.userId, supplierFeedSubscriptions.supplierId],
        set: { updatedAt: null, failure: null },
      });
    revalidatePath('/loja-pronta/produtos');
    redirect('/loja-pronta/produtos?resultado=queued');
  });
}

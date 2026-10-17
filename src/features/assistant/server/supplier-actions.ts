'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { supplierFeedSubscriptions } from '@/server/db/schema';
import { requireProductAction } from '@/features/products/server/access';
import { configuredSupplierSources } from '@/features/shopee/supplier-feed';

export async function subscribeSupplierFeed(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const supplierId = String(form.get('supplierId') ?? '');
  if (!configuredSupplierSources().some((source) => source.id === supplierId))
    redirect('/loja-pronta/produtos?resultado=invalid');
  await db
    .insert(supplierFeedSubscriptions)
    .values({ userId, supplierId })
    .onConflictDoUpdate({
      target: [supplierFeedSubscriptions.userId, supplierFeedSubscriptions.supplierId],
      set: { updatedAt: null, failure: null },
    });
  revalidatePath('/loja-pronta/produtos');
  redirect('/loja-pronta/produtos?resultado=queued');
}

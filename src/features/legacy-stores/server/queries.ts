import { and, asc, eq, sql } from 'drizzle-orm';
import { cache } from 'react';
import { z } from 'zod';
import { parsePageNumber } from '@/lib/search-params';
import { db } from '@/server/db';
import {
  legacyCustomers,
  legacyPurchaseReferences,
  legacyStoreProducts,
  legacyStores,
} from '@/server/db/schema';

const productCount = sql<number>`(select count(*)::int from ${legacyStoreProducts}
  where ${legacyStoreProducts.storeId}=${legacyStores.id})`;

export const listLegacyStoresForUser = cache(async (userId: string) =>
  db
    .select({ id: legacyStores.id, record: legacyStores.record, products: productCount })
    .from(legacyStores)
    .innerJoin(legacyCustomers, eq(legacyStores.customerId, legacyCustomers.id))
    .where(eq(legacyCustomers.userId, userId))
    .orderBy(asc(legacyStores.id)),
);

export const LEGACY_PRODUCTS_PAGE_SIZE = 30;

export async function getLegacyMembershipForUser(userId: string) {
  const [customer] = await db
    .select({ record: legacyCustomers.record, id: legacyCustomers.id })
    .from(legacyCustomers)
    .where(eq(legacyCustomers.userId, userId));
  if (!customer) return null;
  const purchases = await db
    .select({ transaction: legacyPurchaseReferences.transactionId })
    .from(legacyPurchaseReferences)
    .where(eq(legacyPurchaseReferences.customerId, customer.id))
    .orderBy(asc(legacyPurchaseReferences.transactionId));
  return { customer: customer.record, purchases };
}

export async function getLegacyStoreForUser(userId: string, id: string, page = 1) {
  if (!z.guid().safeParse(id).success) return null;
  const [store] = await db
    .select({
      id: legacyStores.id,
      customerId: legacyStores.customerId,
      record: legacyStores.record,
    })
    .from(legacyStores)
    .innerJoin(legacyCustomers, eq(legacyStores.customerId, legacyCustomers.id))
    .where(and(eq(legacyStores.id, id), eq(legacyCustomers.userId, userId)));
  if (!store) return null;
  // A linked store can supply products only while it belongs to this same customer and account.
  const [linked] = store.record.loja_shopee_vinculada_id
    ? await db
        .select({ id: legacyStores.id, record: legacyStores.record })
        .from(legacyStores)
        .innerJoin(legacyCustomers, eq(legacyStores.customerId, legacyCustomers.id))
        .where(
          and(
            eq(legacyStores.id, store.record.loja_shopee_vinculada_id),
            eq(legacyStores.customerId, store.customerId),
            eq(legacyCustomers.userId, userId),
          ),
        )
    : [];
  const productStoreId = linked?.id ?? store.id;
  const [products, [total], purchases] = await Promise.all([
    db
      .select({ id: legacyStoreProducts.id, record: legacyStoreProducts.record })
      .from(legacyStoreProducts)
      .where(eq(legacyStoreProducts.storeId, productStoreId))
      .orderBy(asc(legacyStoreProducts.id))
      .limit(LEGACY_PRODUCTS_PAGE_SIZE)
      .offset((parsePageNumber(String(page)) - 1) * LEGACY_PRODUCTS_PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(legacyStoreProducts)
      .where(eq(legacyStoreProducts.storeId, productStoreId)),
    db
      .select({ transaction: legacyPurchaseReferences.transactionId })
      .from(legacyPurchaseReferences)
      .where(
        and(
          eq(legacyPurchaseReferences.storeId, store.id),
          eq(legacyPurchaseReferences.customerId, store.customerId),
        ),
      )
      .orderBy(asc(legacyPurchaseReferences.transactionId)),
  ]);
  return { ...store, linked, products, total: total?.count ?? 0, purchases };
}

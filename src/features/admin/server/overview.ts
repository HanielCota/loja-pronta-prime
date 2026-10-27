import { DATABASE_CACHE_SCOPE } from '@/server/cache-context';
import { unstable_cache } from 'next/cache';
import { ADMIN_OVERVIEW_TAG } from './overview-cache';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { HOTMART_RETRYABLE_RESULTS } from '@/features/hotmart/recovery';
import { db } from '@/server/db';
import {
  hotmartEvents,
  hotmartPurchases,
  productAccessEvents,
  studentProducts,
  user,
} from '@/server/db/schema';
import type { AdminOverviewData } from '../components/admin-overview';
import { requireAdmin } from './access';
import { effectiveProductAccess } from '@/features/products/server/eligibility';

/** Os números e as listas curtas da visão geral do painel, lidos de uma vez. */
const readAdminOverview = unstable_cache(
  async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      [accounts],
      products,
      [purchases],
      recentAccounts,
      recentAccess,
      recentHotmart,
      [pendingHotmart],
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          newThisWeek: sql<number>`count(*) filter (where ${user.createdAt} >= ${weekAgo})::int`,
          blocked: sql<number>`count(*) filter (where ${user.banned})::int`,
        })
        .from(user),
      db
        .select({ product: studentProducts.product, total: sql<number>`count(*)::int` })
        .from(studentProducts)
        .where(effectiveProductAccess())
        .groupBy(studentProducts.product),
      db
        .select({ active: sql<number>`count(*) filter (where ${hotmartPurchases.active})::int` })
        .from(hotmartPurchases),
      db
        .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(6),
      db
        .select({
          id: productAccessEvents.id,
          name: user.name,
          product: productAccessEvents.product,
          action: productAccessEvents.action,
          createdAt: productAccessEvents.createdAt,
        })
        .from(productAccessEvents)
        .innerJoin(user, eq(productAccessEvents.targetUserId, user.id))
        .orderBy(desc(productAccessEvents.createdAt))
        .limit(6),
      db
        .select({
          id: hotmartEvents.id,
          event: hotmartEvents.event,
          buyerEmail: hotmartEvents.buyerEmail,
          receivedAt: hotmartEvents.receivedAt,
        })
        .from(hotmartEvents)
        .orderBy(desc(hotmartEvents.receivedAt))
        .limit(6),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(hotmartEvents)
        .where(inArray(hotmartEvents.result, [...HOTMART_RETRYABLE_RESULTS])),
    ]);

    const byProduct = (id: 'sll' | 'loja-pronta') =>
      products.find((item) => item.product === id)?.total ?? 0;

    return {
      totals: {
        accounts: accounts?.total ?? 0,
        newThisWeek: accounts?.newThisWeek ?? 0,
        blocked: accounts?.blocked ?? 0,
        sll: byProduct('sll'),
        lojaPronta: byProduct('loja-pronta'),
        activePurchases: purchases?.active ?? 0,
        pendingHotmart: pendingHotmart?.total ?? 0,
      },
      recentAccounts: recentAccounts.map((row) => ({ ...row, createdAt: row.createdAt.getTime() })),
      recentAccess: recentAccess.map((row) => ({ ...row, createdAt: row.createdAt.getTime() })),
      recentHotmart: recentHotmart.map((row) => ({ ...row, receivedAt: row.receivedAt.getTime() })),
    };
  },
  ['admin-overview', DATABASE_CACHE_SCOPE],
  { revalidate: 60, tags: [ADMIN_OVERVIEW_TAG] },
);

/** A permissão fica fora do cache; datas voltam como Date depois da leitura serializada. */
export async function getAdminOverview(): Promise<AdminOverviewData> {
  await requireAdmin('/admin');
  const data = await readAdminOverview();
  return {
    ...data,
    recentAccounts: data.recentAccounts.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
    recentAccess: data.recentAccess.map((row) => ({ ...row, createdAt: new Date(row.createdAt) })),
    recentHotmart: data.recentHotmart.map((row) => ({
      ...row,
      receivedAt: new Date(row.receivedAt),
    })),
  };
}

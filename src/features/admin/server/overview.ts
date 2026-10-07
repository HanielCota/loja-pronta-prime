import { desc, eq, sql } from 'drizzle-orm';
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

/** Os números e as listas curtas da visão geral do painel, lidos de uma vez. */
export async function getAdminOverview(): Promise<AdminOverviewData> {
  await requireAdmin('/admin');
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[accounts], products, [purchases], recentAccounts, recentAccess, recentHotmart] =
    await Promise.all([
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
    },
    recentAccounts,
    recentAccess,
    recentHotmart,
  };
}

import { asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { manualProductGrants, user } from '@/server/db/schema';
import { requireAdmin } from './access';

/** Legacy grants need evidence; never manufacture a date from their migration time. */
export async function listUndatedManualGrants(page = 1) {
  await requireAdmin('/admin/acessos');
  const where = isNull(manualProductGrants.expiresAt);
  const [rows, [count]] = await Promise.all([
    db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        product: manualProductGrants.product,
      })
      .from(manualProductGrants)
      .innerJoin(user, eq(user.id, manualProductGrants.userId))
      .where(where)
      .orderBy(asc(user.id), asc(manualProductGrants.product))
      .limit(50)
      .offset((page - 1) * 50),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(manualProductGrants)
      .where(where),
  ]);
  return { rows, total: count?.total ?? 0 };
}

export async function getAccountManualGrants(userId: string) {
  await requireAdmin(`/admin/contas/${userId}`);
  return db.select().from(manualProductGrants).where(eq(manualProductGrants.userId, userId));
}

import { and, eq, gt, isNull, lte, or } from 'drizzle-orm';
import type { db } from '@/server/db';
import {
  hotmartProductMappings,
  hotmartPurchases,
  hotmartPurchaseAccessRevocations,
  manualProductGrants,
  studentProducts,
  historicalSllPurchases,
} from '@/server/db/schema';
import type { ProductId } from '@/config/products';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Call while holding the mapping lock and the account advisory lock. */
export async function reconcileProductAccess(tx: Transaction, userId: string, product: ProductId) {
  const manual = await tx.query.manualProductGrants.findFirst({
    columns: { userId: true },
    where: and(
      eq(manualProductGrants.userId, userId),
      eq(manualProductGrants.product, product),
      or(isNull(manualProductGrants.expiresAt), gt(manualProductGrants.expiresAt, new Date())),
    ),
  });
  const [purchase] = await tx
    .select({ transaction: hotmartPurchases.transaction })
    .from(hotmartPurchases)
    .innerJoin(
      hotmartProductMappings,
      and(
        eq(hotmartProductMappings.productUcode, hotmartPurchases.productUcode),
        eq(hotmartProductMappings.access, product),
      ),
    )
    .leftJoin(
      hotmartPurchaseAccessRevocations,
      and(
        eq(hotmartPurchaseAccessRevocations.transaction, hotmartPurchases.transaction),
        eq(hotmartPurchaseAccessRevocations.product, product),
      ),
    )
    .where(
      and(
        eq(hotmartPurchases.userId, userId),
        eq(hotmartPurchases.active, true),
        gt(hotmartPurchases.expiresAt, new Date()),
        lte(hotmartPurchases.purchasedAt, new Date()),
        isNull(hotmartPurchaseAccessRevocations.transaction),
      ),
    )
    .limit(1);
  const historical =
    product === 'sll'
      ? await tx.query.historicalSllPurchases.findFirst({
          columns: { transaction: true },
          where: and(
            eq(historicalSllPurchases.userId, userId),
            eq(historicalSllPurchases.active, true),
            isNull(historicalSllPurchases.revokedAt),
            lte(historicalSllPurchases.purchasedAt, new Date()),
            gt(historicalSllPurchases.expiresAt, new Date()),
          ),
        })
      : undefined;
  if (manual || purchase || historical) {
    await tx.insert(studentProducts).values({ userId, product }).onConflictDoNothing();
    return;
  }
  await tx
    .delete(studentProducts)
    .where(and(eq(studentProducts.userId, userId), eq(studentProducts.product, product)));
}

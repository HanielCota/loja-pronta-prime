import { and, eq, isNull } from 'drizzle-orm';
import type { db } from '@/server/db';
import {
  hotmartProductMappings,
  hotmartPurchases,
  hotmartPurchaseAccessRevocations,
  manualProductGrants,
  studentProducts,
} from '@/server/db/schema';
import type { ProductId } from '@/config/products';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Call while holding the mapping lock and the account advisory lock. */
export async function reconcileProductAccess(tx: Transaction, userId: string, product: ProductId) {
  const manual = await tx.query.manualProductGrants.findFirst({
    columns: { userId: true },
    where: and(eq(manualProductGrants.userId, userId), eq(manualProductGrants.product, product)),
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
        isNull(hotmartPurchaseAccessRevocations.transaction),
      ),
    )
    .limit(1);
  if (manual || purchase) {
    await tx.insert(studentProducts).values({ userId, product }).onConflictDoNothing();
  } else {
    await tx
      .delete(studentProducts)
      .where(and(eq(studentProducts.userId, userId), eq(studentProducts.product, product)));
  }
}

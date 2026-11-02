import { and, eq, gt, isNull, lte, max, notExists, or, sql } from 'drizzle-orm';
import type { ProductId } from '@/config/products';
import { db } from '@/server/db';
import {
  historicalSllPurchases,
  hotmartProductMappings,
  hotmartPurchaseAccessRevocations,
  hotmartPurchases,
  manualProductGrants,
} from '@/server/db/schema';
import type { AccessValidity } from '../access-validity';

/** Show the longest valid purchase/manual term; unresolved legacy grants retain their old status. */
export async function getAccessValidity(userId: string): Promise<{
  byProduct: Partial<Record<ProductId, AccessValidity>>;
  /** A hora da leitura, pra contar os dias que faltam sem chamar o relógio na renderização. */
  checkedAt: Date;
}> {
  const now = sql`now()`;
  const [manual, purchases, historical] = await Promise.all([
    db
      .select({ product: manualProductGrants.product, expiresAt: manualProductGrants.expiresAt })
      .from(manualProductGrants)
      .where(
        and(
          eq(manualProductGrants.userId, userId),
          or(isNull(manualProductGrants.expiresAt), gt(manualProductGrants.expiresAt, now)),
        ),
      ),
    db
      .select({
        product: hotmartProductMappings.access,
        expiresAt: max(hotmartPurchases.expiresAt),
      })
      .from(hotmartPurchases)
      .innerJoin(
        hotmartProductMappings,
        eq(hotmartProductMappings.productUcode, hotmartPurchases.productUcode),
      )
      .where(
        and(
          eq(hotmartPurchases.userId, userId),
          eq(hotmartPurchases.active, true),
          lte(hotmartPurchases.purchasedAt, now),
          gt(hotmartPurchases.expiresAt, now),
          notExists(
            db
              .select({ one: sql`1` })
              .from(hotmartPurchaseAccessRevocations)
              .where(
                and(
                  eq(hotmartPurchaseAccessRevocations.transaction, hotmartPurchases.transaction),
                  eq(hotmartPurchaseAccessRevocations.product, hotmartProductMappings.access),
                ),
              ),
          ),
        ),
      )
      .groupBy(hotmartProductMappings.access),
    db
      .select({ expiresAt: max(historicalSllPurchases.expiresAt) })
      .from(historicalSllPurchases)
      .where(
        and(
          eq(historicalSllPurchases.userId, userId),
          eq(historicalSllPurchases.active, true),
          isNull(historicalSllPurchases.revokedAt),
          lte(historicalSllPurchases.purchasedAt, now),
          gt(historicalSllPurchases.expiresAt, now),
        ),
      ),
  ]);

  const result: Partial<Record<ProductId, AccessValidity>> = {};
  const extend = (product: ProductId, expiresAt: Date | null | undefined) => {
    if (!expiresAt) return;
    const current = result[product];
    if (current?.kind === 'no-end') return;
    if (current && current.expiresAt >= expiresAt) return;
    result[product] = { kind: 'until', expiresAt };
  };

  for (const { product, expiresAt } of purchases) extend(product, expiresAt);
  extend('sll', historical[0]?.expiresAt);
  // Only unresolved legacy grants can still have no end date.
  for (const { product, expiresAt } of manual) {
    if (expiresAt) extend(product, expiresAt);
    else result[product] = { kind: 'no-end' };
  }
  return { byProduct: result, checkedAt: new Date() };
}

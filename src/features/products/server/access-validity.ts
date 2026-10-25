import { and, eq, gt, isNull, lte, max, notExists, sql } from 'drizzle-orm';
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

/**
 * Até quando vale cada área dela, pelas mesmas regras de `effectiveProductAccess`: liberação
 * manual não acaba; compra da Hotmart (ou histórica do SLL) vale até a data final mais longa.
 * Só leitura: mostrar a data nunca muda o acesso.
 */
export async function getAccessValidity(userId: string): Promise<{
  byProduct: Partial<Record<ProductId, AccessValidity>>;
  /** A hora da leitura, pra contar os dias que faltam sem chamar o relógio na renderização. */
  checkedAt: Date;
}> {
  const now = sql`now()`;
  const [manual, purchases, historical] = await Promise.all([
    db
      .select({ product: manualProductGrants.product })
      .from(manualProductGrants)
      .where(eq(manualProductGrants.userId, userId)),
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
  // Por último: a liberação manual vale mais que qualquer data de compra.
  for (const { product } of manual) result[product] = { kind: 'no-end' };
  return { byProduct: result, checkedAt: new Date() };
}

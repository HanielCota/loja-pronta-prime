import { eq, sql } from 'drizzle-orm';
import type { db } from '@/server/db';
import { hotmartProductIds, hotmartProductMappings } from '@/server/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const productIdentityConflict = 'ID e código do produto incompatíveis; acesso não alterado.';

/** Call under the mapping lock, before taking purchase/account locks. */
export async function resolveProductIdentity(
  tx: Transaction,
  product: { ucode: string; id?: number | undefined },
) {
  if (product.id !== undefined) {
    // Serialize both first binding and concurrent deliveries for the same identity.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`hotmart-id:${product.id}`}))`);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`hotmart-ucode:${product.ucode}`}))`,
    );
  }
  const mapping = await tx.query.hotmartProductMappings.findMany({
    where: eq(hotmartProductMappings.productUcode, product.ucode),
  });
  if (product.id === undefined) return { mapping, conflict: false };
  const identity = await tx.query.hotmartProductIds.findFirst({
    where: eq(hotmartProductIds.productId, product.id),
  });
  const bound = await tx.query.hotmartProductIds.findFirst({
    where: eq(hotmartProductIds.productUcode, product.ucode),
  });
  if (
    (bound && bound.productId !== product.id) ||
    (identity?.productUcode && identity.productUcode !== product.ucode) ||
    (identity &&
      mapping.some((item) => item.access !== identity.access || item.expert !== identity.expert))
  )
    return { mapping: [], conflict: true };
  if (!identity) return { mapping, conflict: false };

  // Preserve ucode joins used by refunds, account access and expert selection.
  if (!mapping.length) {
    const [alias] = await tx
      .insert(hotmartProductMappings)
      .values({
        productUcode: product.ucode,
        access: identity.access,
        expert: identity.expert,
        primary: false,
      })
      .returning();
    mapping.push(alias!);
  }
  if (!identity.productUcode)
    await tx
      .update(hotmartProductIds)
      .set({ productUcode: product.ucode })
      .where(eq(hotmartProductIds.productId, product.id));
  return { mapping, conflict: false };
}

import { createHash } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantJobs,
  assistantPublicationItems,
  shopeeConnections,
  supplierCatalog,
  supplierPublicationMappings,
} from '@/server/db/schema';
import { prepareSupplierProduct } from '@/features/shopee/catalog';
import { shopeeApplicationId } from '@/features/shopee/authorization';
import { assertAssistantAccess } from './metrics';
import { publicationPayloadSchema, type PublicationPayload } from '../model';

const fingerprint = (payload: PublicationPayload) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex');

/** Nova confirmação usa dados recentes do mesmo SKU, loja e aplicativo. Nunca cria um sexto item. */
export async function publicationCorrections(userId: string) {
  let config;
  try {
    config = await assertAssistantAccess(userId, 'loja-pronta');
  } catch {
    return [];
  }
  if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true') return [];
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  if (
    !connection ||
    connection.revokedAt ||
    connection.applicationId !== shopeeApplicationId(config)
  )
    return [];
  const rows = await db
    .select({
      item: assistantPublicationItems,
      catalog: supplierCatalog,
      mapping: supplierPublicationMappings,
    })
    .from(assistantPublicationItems)
    .innerJoin(
      supplierCatalog,
      and(
        eq(supplierCatalog.supplierId, assistantPublicationItems.supplierId),
        eq(supplierCatalog.sku, assistantPublicationItems.sku),
      ),
    )
    .innerJoin(
      supplierPublicationMappings,
      and(
        eq(supplierPublicationMappings.userId, assistantPublicationItems.userId),
        eq(supplierPublicationMappings.shopId, assistantPublicationItems.shopId),
        eq(supplierPublicationMappings.applicationId, assistantPublicationItems.applicationId),
        eq(supplierPublicationMappings.supplierId, assistantPublicationItems.supplierId),
        eq(supplierPublicationMappings.sku, assistantPublicationItems.sku),
      ),
    )
    .innerJoin(
      assistantJobs,
      and(
        eq(
          assistantJobs.deduplicationKey,
          sql`'publish:' || ${assistantPublicationItems.id}::text`,
        ),
        eq(assistantJobs.status, 'blocked'),
      ),
    )
    .where(
      and(
        eq(assistantPublicationItems.userId, userId),
        eq(assistantPublicationItems.shopId, connection.shopId),
        eq(assistantPublicationItems.applicationId, connection.applicationId),
        inArray(assistantPublicationItems.status, ['pending', 'failed']),
      ),
    );
  return rows.flatMap(({ item, catalog, mapping }) => {
    const ready = prepareSupplierProduct(catalog.product, new Date());
    const parsed = publicationPayloadSchema.safeParse(mapping.payload);
    if (
      ready.status !== 'prepared' ||
      !('product' in ready) ||
      ready.product.variants.length ||
      !parsed.success ||
      parsed.data.item_sku !== item.sku ||
      Math.round(parsed.data.original_price * 100) !== ready.product.priceCents ||
      parsed.data.normal_stock > ready.product.stock
    )
      return [];
    return [
      {
        itemId: item.id,
        title: parsed.data.item_name,
        previousPrice: item.payload.original_price,
        price: parsed.data.original_price,
        stock: parsed.data.normal_stock,
        fingerprint: fingerprint(parsed.data),
      },
    ];
  });
}

export async function reauthorizePublicationItem(userId: string, itemId: string, expected: string) {
  const config = await assertAssistantAccess(userId, 'loja-pronta');
  if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true') return false;
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(assistantJobs)
      .where(
        and(
          eq(assistantJobs.userId, userId),
          eq(assistantJobs.deduplicationKey, `publish:${itemId}`),
          eq(assistantJobs.status, 'blocked'),
        ),
      )
      .for('update');
    if (!job) return false;
    const [item] = await tx
      .select()
      .from(assistantPublicationItems)
      .where(
        and(
          eq(assistantPublicationItems.userId, userId),
          eq(assistantPublicationItems.id, itemId),
          inArray(assistantPublicationItems.status, ['pending', 'failed']),
        ),
      )
      .for('update');
    const [connection] = await tx
      .select()
      .from(shopeeConnections)
      .where(and(eq(shopeeConnections.userId, userId), sql`${shopeeConnections.revokedAt} is null`))
      .for('update');
    if (
      !item ||
      !connection ||
      connection.shopId !== item.shopId ||
      connection.applicationId !== item.applicationId ||
      item.applicationId !== shopeeApplicationId(config)
    )
      return false;
    const [mapping] = await tx
      .select()
      .from(supplierPublicationMappings)
      .where(
        and(
          eq(supplierPublicationMappings.userId, userId),
          eq(supplierPublicationMappings.shopId, item.shopId),
          eq(supplierPublicationMappings.applicationId, item.applicationId),
          eq(supplierPublicationMappings.supplierId, item.supplierId),
          eq(supplierPublicationMappings.sku, item.sku),
        ),
      )
      .for('share');
    const [catalog] = await tx
      .select()
      .from(supplierCatalog)
      .where(
        and(eq(supplierCatalog.supplierId, item.supplierId), eq(supplierCatalog.sku, item.sku)),
      )
      .for('share');
    if (!mapping || !catalog) return false;
    const ready = prepareSupplierProduct(catalog.product, new Date());
    const payload = publicationPayloadSchema.safeParse(mapping.payload);
    if (
      ready.status !== 'prepared' ||
      !('product' in ready) ||
      ready.product.variants.length ||
      !payload.success ||
      payload.data.item_sku !== item.sku ||
      Math.round(payload.data.original_price * 100) !== ready.product.priceCents ||
      payload.data.normal_stock > ready.product.stock ||
      fingerprint(payload.data) !== expected
    )
      return false;
    await tx
      .update(assistantPublicationItems)
      .set({ payload: payload.data, status: 'pending', failure: null, authorizedAt: new Date() })
      .where(eq(assistantPublicationItems.id, item.id));
    await tx
      .update(assistantJobs)
      .set({ status: 'pending', failure: null, leaseUntil: null, runAt: new Date() })
      .where(eq(assistantJobs.id, job.id));
    return true;
  });
}

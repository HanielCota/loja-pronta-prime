import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantPublicationItems,
  shopeeConnections,
  supplierCatalog,
  supplierPublicationMappings,
} from '@/server/db/schema';
import { prepareSupplierProduct } from '@/features/shopee/catalog';
import { canUseShopee, shopeeApplicationId } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { publicationPayloadSchema } from '../model';

/** Só oferece produtos reais, recentes e preparados para esta conta e este aplicativo. */
export async function availableSupplierProducts(userId: string, role: string | null | undefined) {
  const config = getShopeeConfiguration();
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  if (
    !config ||
    !canUseShopee(config, userId, role) ||
    !connection ||
    connection.revokedAt ||
    connection.applicationId !== shopeeApplicationId(config)
  )
    return { status: 'connection' as const, products: [] };
  if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true' || config.SHOPEE_ENVIRONMENT !== 'live')
    return { status: 'preparing' as const, products: [] };
  const rows = await db
    .select({ catalog: supplierCatalog, mapping: supplierPublicationMappings })
    .from(supplierPublicationMappings)
    .innerJoin(
      supplierCatalog,
      and(
        eq(supplierCatalog.supplierId, supplierPublicationMappings.supplierId),
        eq(supplierCatalog.sku, supplierPublicationMappings.sku),
      ),
    )
    .where(
      and(
        eq(supplierPublicationMappings.userId, userId),
        eq(supplierPublicationMappings.shopId, connection.shopId),
        eq(supplierPublicationMappings.applicationId, connection.applicationId),
      ),
    );
  const used = await db
    .select({
      supplierId: assistantPublicationItems.supplierId,
      sku: assistantPublicationItems.sku,
    })
    .from(assistantPublicationItems)
    .where(
      and(
        eq(assistantPublicationItems.userId, userId),
        eq(assistantPublicationItems.shopId, connection.shopId),
        eq(assistantPublicationItems.applicationId, connection.applicationId),
      ),
    );
  const products = rows.flatMap(({ catalog, mapping }) => {
    const ready = prepareSupplierProduct(catalog.product, new Date());
    const payload = publicationPayloadSchema.safeParse(mapping.payload);
    if (
      ready.status !== 'prepared' ||
      !('product' in ready) ||
      ready.product.variants.length ||
      !payload.success ||
      used.some((item) => item.sku === catalog.sku)
    )
      return [];
    if (
      payload.data.item_sku !== catalog.sku ||
      Math.round(payload.data.original_price * 100) !== ready.product.priceCents ||
      payload.data.normal_stock > ready.product.stock
    )
      return [];
    return [{ ...ready.product, categoryId: payload.data.category_id }];
  });
  return { status: 'ready' as const, products };
}

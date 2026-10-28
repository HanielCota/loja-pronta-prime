import { isDeepStrictEqual } from 'node:util';
import { and, eq, lt, isNull, or } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  supplierFeedSubscriptions,
  supplierCatalog,
  supplierPublicationMappings,
  shopeeConnections,
} from '@/server/db/schema';
import {
  configuredSupplierSources,
  supplierFeedSnapshotSchema,
} from '@/features/shopee/supplier-feed';
import { downloadPublicFile } from '@/features/shopee/server/remote-file';
import { publicationPayloadSchema } from '../model';
import { prepareShopeeProduct } from '@/features/shopee/server/preparation';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { shopeeApplicationId } from '@/features/shopee/authorization';
import { assertAssistantAccess } from './metrics';

/** O feed só prepara ofertas. Publicar continua exigindo confirmação da aluna. */
export async function syncSupplierFeeds(
  dependencies: {
    download?: typeof downloadPublicFile;
    prepare?: typeof prepareShopeeProduct;
  } = {},
) {
  const download = dependencies.download ?? downloadPublicFile;
  const prepare = dependencies.prepare ?? prepareShopeeProduct;
  for (const source of configuredSupplierSources()) {
    const due = await db
      .select()
      .from(supplierFeedSubscriptions)
      .where(
        and(
          eq(supplierFeedSubscriptions.supplierId, source.id),
          or(
            isNull(supplierFeedSubscriptions.updatedAt),
            lt(
              supplierFeedSubscriptions.updatedAt,
              new Date(Date.now() - source.intervalSeconds * 1000),
            ),
          ),
        ),
      )
      .limit(20);
    if (!due.length) continue;
    const client = await db.$client.connect();
    const key = `supplier-feed:${source.id}`;
    try {
      const lock = await client.query<{ locked: boolean }>(
        'select pg_try_advisory_lock(hashtext($1)) as locked',
        [key],
      );
      if (!lock.rows[0]?.locked) continue;
      const token = source.tokenEnv ? process.env[source.tokenEnv] : undefined;
      if (source.tokenEnv && !token) throw new Error('Credencial do fornecedor ausente.');
      const downloaded = await download(
        source.url,
        [new URL(source.url).hostname],
        5_000_000,
        token,
      );
      const snapshot = supplierFeedSnapshotSchema.parse(
        JSON.parse(downloaded.bytes.toString('utf8')),
      );
      const age = Date.now() - Date.parse(snapshot.generatedAt);
      if (
        age < 0 ||
        age > 15 * 60_000 ||
        snapshot.products.some((row) => row.supplierId !== source.id)
      )
        throw new Error('Catálogo desatualizado ou incompatível.');
      await db.transaction(async (tx) => {
        for (const product of snapshot.products.toSorted((a, b) => a.sku.localeCompare(b.sku))) {
          await tx
            .insert(supplierCatalog)
            .values({
              supplierId: source.id,
              sku: product.sku,
              product,
              updatedAt: new Date(product.updatedAt),
            })
            .onConflictDoUpdate({
              target: [supplierCatalog.supplierId, supplierCatalog.sku],
              set: { product, updatedAt: new Date(product.updatedAt) },
              setWhere: lt(supplierCatalog.updatedAt, new Date(product.updatedAt)),
            });
        }
        const previous = await tx
          .select()
          .from(supplierCatalog)
          .where(eq(supplierCatalog.supplierId, source.id))
          .for('update');
        const present = new Set(snapshot.products.map((row) => row.sku));
        for (const row of previous)
          if (!present.has(row.sku) && row.updatedAt.getTime() < Date.parse(snapshot.generatedAt)) {
            const product = {
              ...row.product,
              stock: 0,
              variants: row.product.variants.map((variant) => ({ ...variant, stock: 0 })),
              updatedAt: snapshot.generatedAt,
            };
            await tx
              .update(supplierCatalog)
              .set({ product, updatedAt: new Date(snapshot.generatedAt) })
              .where(
                and(eq(supplierCatalog.supplierId, source.id), eq(supplierCatalog.sku, row.sku)),
              );
          }
      });
      for (const subscription of due) {
        let failure: string | null = null;
        let cursor = subscription.cursor;
        try {
          const config = await assertAssistantAccess(subscription.userId, 'loja-pronta');
          const access = await readShopeeAccess(subscription.userId, config);
          const mappings = await db
            .select()
            .from(supplierPublicationMappings)
            .where(
              and(
                eq(supplierPublicationMappings.userId, subscription.userId),
                eq(supplierPublicationMappings.supplierId, source.id),
                eq(supplierPublicationMappings.applicationId, shopeeApplicationId(config)),
                eq(supplierPublicationMappings.shopId, access.shopId),
              ),
            );
          const sorted = snapshot.products
            .filter((product) => product.marketplace && product.stock > 0)
            .toSorted((a, b) => a.sku.localeCompare(b.sku));
          const ordered = [
            ...sorted.filter((product) => product.sku > (subscription.cursor ?? '')),
            ...sorted.filter((product) => product.sku <= (subscription.cursor ?? '')),
          ].slice(0, 5);
          for (const product of ordered) {
            cursor = product.sku;
            try {
              // Produtos incompletos não impedem atualizar o estoque dos demais.
              if (!product.marketplace || !product.stock) continue;
              const old = publicationPayloadSchema.safeParse(
                mappings.find((row) => row.sku === product.sku)?.payload,
              );
              const payload = await prepare(
                config,
                access,
                product,
                source.imageHosts,
                fetch,
                old.success ? old.data : undefined,
              );
              await db.transaction(async (tx) => {
                const [catalog] = await tx
                  .select()
                  .from(supplierCatalog)
                  .where(
                    and(
                      eq(supplierCatalog.supplierId, source.id),
                      eq(supplierCatalog.sku, product.sku),
                    ),
                  )
                  .for('share');
                const [connection] = await tx
                  .select()
                  .from(shopeeConnections)
                  .where(eq(shopeeConnections.userId, subscription.userId))
                  .for('share');
                if (
                  !catalog ||
                  !isDeepStrictEqual(catalog.product, product) ||
                  !connection ||
                  connection.revokedAt ||
                  connection.shopId !== access.shopId ||
                  connection.applicationId !== shopeeApplicationId(config)
                )
                  return;
                await tx
                  .insert(supplierPublicationMappings)
                  .values({
                    userId: subscription.userId,
                    shopId: access.shopId,
                    applicationId: shopeeApplicationId(config),
                    supplierId: source.id,
                    sku: product.sku,
                    payload,
                    confirmedBy: subscription.userId,
                  })
                  .onConflictDoUpdate({
                    target: [
                      supplierPublicationMappings.userId,
                      supplierPublicationMappings.supplierId,
                      supplierPublicationMappings.sku,
                      supplierPublicationMappings.shopId,
                      supplierPublicationMappings.applicationId,
                    ],
                    set: { payload, confirmedAt: new Date(), confirmedBy: subscription.userId },
                  });
              });
            } catch {
              failure = 'product-unavailable';
            }
          }
        } catch {
          failure = 'preparation-unavailable';
        }
        await db
          .update(supplierFeedSubscriptions)
          .set({ updatedAt: new Date(), failure, cursor })
          .where(
            and(
              eq(supplierFeedSubscriptions.userId, subscription.userId),
              eq(supplierFeedSubscriptions.supplierId, source.id),
            ),
          );
      }
    } catch {
      for (const subscription of due)
        await db
          .update(supplierFeedSubscriptions)
          .set({ updatedAt: new Date(), failure: 'feed-unavailable' })
          .where(
            and(
              eq(supplierFeedSubscriptions.userId, subscription.userId),
              eq(supplierFeedSubscriptions.supplierId, source.id),
            ),
          );
    } finally {
      let discard = false;
      try {
        await client.query('select pg_advisory_unlock(hashtext($1))', [key]);
      } catch {
        // A failed unlock leaves ownership uncertain; discard rather than reuse the connection.
        discard = true;
      } finally {
        client.release(discard);
      }
    }
  }
}

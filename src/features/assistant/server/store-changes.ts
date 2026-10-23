import { and, asc, eq, gt, lte, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { brandPublicationEnabled } from '@/features/brand/server/publication-settings';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { db } from '@/server/db';
import {
  shopeeConnections,
  storeAutomationJobs,
  assistantJobs,
  storeBrand,
} from '@/server/db/schema';
import { shopeeApplicationId } from '@/features/shopee/authorization';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import {
  addShopeeItem,
  readShopeeResource,
  writeShopeeResource,
} from '@/features/shopee/server/resources';
import {
  publishProductVariations,
  readProductModels,
  modelsMatchPublication,
} from '@/features/shopee/server/variations';
import { ShopeeApiError } from '@/features/shopee/server/client';
import { assertAssistantAccess } from './metrics';
import {
  brandChangeSchema,
  listingChangeSchema,
  listingCloneSchema,
  changeMatches,
} from '../store-changes';
import { readCloneOffer } from './listing-clones';
import { findSku } from './operations';

export async function queueStoreChange(
  userId: string,
  kind: 'brand' | 'edit' | 'clone',
  input: unknown,
  sourceFingerprint?: string,
) {
  const payload =
    kind === 'brand'
      ? brandChangeSchema.parse(input)
      : kind === 'clone'
        ? listingCloneSchema.parse(input)
        : listingChangeSchema.parse(input);
  if (kind === 'clone' && process.env.SHOPEE_DUPLICATION_ENABLED !== 'true')
    throw new Error('Experimentos com novos anúncios indisponíveis.');
  const config = await assertAssistantAccess(userId, kind === 'brand' ? 'loja-pronta' : 'sll');
  if (
    kind === 'brand'
      ? !brandPublicationEnabled()
      : process.env.SHOPEE_PUBLICATION_ENABLED !== 'true'
  )
    throw new Error('Alterações indisponíveis.');
  const access = await readShopeeAccess(userId, config);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`store-change:${userId}`}))`);
    if (kind === 'brand' && sourceFingerprint) {
      const [brand] = await tx
        .select()
        .from(storeBrand)
        .where(eq(storeBrand.userId, userId))
        .for('share');
      if (
        !brand ||
        brand.publicationFingerprint !== sourceFingerprint ||
        brandFingerprint(brand) !== sourceFingerprint
      )
        throw new Error('Marca alterada.');
      const [previous] = await tx
        .select({ id: storeAutomationJobs.id })
        .from(storeAutomationJobs)
        .where(
          and(
            eq(storeAutomationJobs.userId, userId),
            eq(storeAutomationJobs.shopId, String(access.shopId)),
            eq(storeAutomationJobs.applicationId, shopeeApplicationId(config)),
            eq(storeAutomationJobs.kind, 'brand'),
            eq(storeAutomationJobs.sourceFingerprint, sourceFingerprint),
          ),
        );
      if (previous) return previous.id;
      const [unresolved] = await tx
        .select({ id: storeAutomationJobs.id })
        .from(storeAutomationJobs)
        .where(
          and(
            eq(storeAutomationJobs.userId, userId),
            eq(storeAutomationJobs.kind, 'brand'),
            inArray(storeAutomationJobs.status, ['pending', 'running', 'unknown']),
          ),
        );
      if (unresolved) throw new Error('Confira o envio anterior.');
    }
    const [existing] = await tx
      .select({ id: storeAutomationJobs.id })
      .from(storeAutomationJobs)
      .where(
        and(
          eq(storeAutomationJobs.userId, userId),
          eq(storeAutomationJobs.shopId, String(access.shopId)),
          eq(storeAutomationJobs.applicationId, shopeeApplicationId(config)),
          eq(storeAutomationJobs.kind, kind),
          kind === 'clone'
            ? sql`true`
            : inArray(storeAutomationJobs.status, ['pending', 'running', 'unknown']),
          kind === 'clone'
            ? sql`${storeAutomationJobs.payload}->'template'->>'item_sku' = ${listingCloneSchema.parse(payload).template.item_sku}`
            : sql`${storeAutomationJobs.payload} = ${JSON.stringify(payload)}::jsonb`,
        ),
      );
    if (existing) return existing.id;
    const [created] = await tx
      .insert(storeAutomationJobs)
      .values({
        userId,
        shopId: String(access.shopId),
        applicationId: shopeeApplicationId(config),
        kind,
        payload,
        sourceFingerprint,
      })
      .returning({ id: storeAutomationJobs.id });
    return created!.id;
  });
}

/** Uma operação por tarefa; uma resposta incerta só é consultada, nunca repetida. */
export async function processStoreChange(fetcher: typeof fetch = fetch) {
  const job = await db.transaction(async (tx) => {
    await tx
      .update(storeAutomationJobs)
      .set({ status: 'unknown', failure: 'interrupted', leaseUntil: null })
      .where(
        and(
          eq(storeAutomationJobs.status, 'running'),
          lte(storeAutomationJobs.leaseUntil, new Date()),
        ),
      );
    const [next] = await tx
      .select()
      .from(storeAutomationJobs)
      .where(eq(storeAutomationJobs.status, 'pending'))
      .orderBy(asc(storeAutomationJobs.createdAt))
      .limit(1)
      .for('update', { skipLocked: true });
    if (!next) return null;
    const [claimed] = await tx
      .update(storeAutomationJobs)
      .set({ status: 'running', leaseUntil: new Date(Date.now() + 5 * 60_000) })
      .where(eq(storeAutomationJobs.id, next.id))
      .returning();
    return claimed!;
  });
  if (!job) return false;
  let sent = false;
  let brandWriteAcknowledged = false;
  try {
    const config = await assertAssistantAccess(
      job.userId,
      job.kind === 'brand' ? 'loja-pronta' : 'sll',
    );
    const access = await readShopeeAccess(job.userId, config, fetcher);
    if (
      String(access.shopId) !== job.shopId ||
      shopeeApplicationId(config) !== job.applicationId ||
      (job.kind === 'brand'
        ? !brandPublicationEnabled()
        : process.env.SHOPEE_PUBLICATION_ENABLED !== 'true')
    )
      throw new Error('Conexão alterada.');
    const payload =
      job.kind === 'brand'
        ? brandChangeSchema.parse(job.payload)
        : job.kind === 'clone'
          ? listingCloneSchema.parse(job.payload)
          : listingChangeSchema.parse(job.payload);
    if (job.kind === 'clone' && process.env.SHOPEE_DUPLICATION_ENABLED !== 'true')
      throw new Error('Experimentos indisponíveis.');
    let baseline: Record<string, unknown>;
    if (job.kind === 'brand')
      baseline = await readShopeeResource(
        config,
        access,
        '/api/v2/shop/get_profile',
        z.record(z.string(), z.unknown()),
        {},
        fetcher,
      );
    else {
      const itemId = z.object({ item_id: z.number() }).parse(payload).item_id;
      const result = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_base_info',
        z.object({ item_list: z.array(z.looseObject({ item_id: z.number() })) }),
        { item_id_list: String(itemId) },
        fetcher,
      );
      const found = result.item_list.find((row) => row.item_id === itemId);
      if (!found) throw new Error('Anúncio indisponível nesta loja.');
      baseline = found;
      if (job.kind === 'clone') {
        const requested = listingCloneSchema.parse(payload);
        const offer = await readCloneOffer(config, access, job.userId, requested.item_id, fetcher);
        if (offer.fingerprint !== requested.sourceFingerprint) throw new Error('Oferta alterada.');
      }
      const desired = job.kind === 'clone' ? listingCloneSchema.parse(payload).template : payload;
      if ('category_id' in desired && desired.category_id !== baseline.category_id) {
        const categories = await readShopeeResource(
          config,
          access,
          '/api/v2/product/get_category',
          z.object({
            category_list: z.array(
              z.object({ category_id: z.number(), has_children: z.boolean() }),
            ),
          }),
          { language: 'pt-br' },
          fetcher,
        );
        if (
          !categories.category_list.some(
            (row) => row.category_id === desired.category_id && !row.has_children,
          )
        )
          throw new Error('Categoria indisponível.');
        const attributes = await readShopeeResource(
          config,
          access,
          '/api/v2/product/get_attributes',
          z.object({
            attribute_list: z.array(
              z.object({ attribute_id: z.number(), is_mandatory: z.boolean() }),
            ),
          }),
          { category_id: String(desired.category_id), language: 'pt-br' },
          fetcher,
        );
        const supplied =
          z
            .object({ attribute_list: z.array(z.object({ attribute_id: z.number() })).optional() })
            .parse(desired).attribute_list ?? [];
        if (
          attributes.attribute_list.some(
            (row) =>
              row.is_mandatory &&
              !supplied.some((value) => value.attribute_id === row.attribute_id),
          )
        )
          throw new Error('A categoria exige novos atributos.');
      }
    }
    await assertAssistantAccess(job.userId, job.kind === 'brand' ? 'loja-pronta' : 'sll');
    const permitted = await db.transaction(async (tx) => {
      const [connection] = await tx
        .select()
        .from(shopeeConnections)
        .where(eq(shopeeConnections.userId, job.userId))
        .for('share');
      if (
        !connection ||
        connection.revokedAt ||
        String(connection.shopId) !== job.shopId ||
        connection.applicationId !== job.applicationId ||
        (job.kind === 'brand'
          ? !brandPublicationEnabled()
          : process.env.SHOPEE_PUBLICATION_ENABLED !== 'true') ||
        (job.kind === 'clone' && process.env.SHOPEE_DUPLICATION_ENABLED !== 'true')
      )
        return false;
      if (job.kind === 'brand' && job.sourceFingerprint) {
        const [brand] = await tx
          .select()
          .from(storeBrand)
          .where(eq(storeBrand.userId, job.userId))
          .for('share');
        if (
          !brand ||
          brand.publicationFingerprint !== job.sourceFingerprint ||
          brandFingerprint(brand) !== job.sourceFingerprint
        )
          return false;
      }
      const [owned] = await tx
        .update(storeAutomationJobs)
        .set({ baseline })
        .where(
          and(
            eq(storeAutomationJobs.id, job.id),
            eq(storeAutomationJobs.status, 'running'),
            gt(storeAutomationJobs.leaseUntil, new Date()),
          ),
        )
        .returning({ id: storeAutomationJobs.id });
      return Boolean(owned);
    });
    if (!permitted) {
      await db
        .update(storeAutomationJobs)
        .set({ status: 'blocked', failure: 'connection-changed' })
        .where(
          and(
            eq(storeAutomationJobs.id, job.id),
            eq(storeAutomationJobs.status, 'running'),
            gt(storeAutomationJobs.leaseUntil, new Date()),
          ),
        );
      return true;
    }
    sent = true;
    if (job.kind === 'clone') {
      const {
        variations,
        sourceImages: _sourceImages,
        ...body
      } = listingCloneSchema.parse(payload).template;
      const created = job.result
        ? { item_id: job.result.itemId }
        : await addShopeeItem(
            config,
            access,
            { ...body, ...(variations ? { item_status: 'UNLIST' } : {}) },
            fetcher,
          );
      await db
        .update(storeAutomationJobs)
        .set({ result: { itemId: created.item_id } })
        .where(eq(storeAutomationJobs.id, job.id));
      if (variations)
        await publishProductVariations(config, access, created.item_id, variations, fetcher);
    } else
      await writeShopeeResource(
        config,
        access,
        job.kind === 'brand' ? '/api/v2/shop/update_profile' : '/api/v2/product/update_item',
        payload,
        z.object({}),
        fetcher,
      );
    if (job.kind === 'brand') {
      brandWriteAcknowledged = true;
      const profile = await readShopeeResource(
        config,
        access,
        '/api/v2/shop/get_profile',
        z.record(z.string(), z.unknown()),
        {},
        fetcher,
      );
      if (!changeMatches(profile, payload)) throw new Error('Perfil ainda não confirmado.');
    }
    await db
      .update(storeAutomationJobs)
      .set({ status: 'completed', completedAt: new Date(), failure: null, leaseUntil: null })
      .where(eq(storeAutomationJobs.id, job.id));
    if (job.kind === 'clone')
      await db
        .insert(assistantJobs)
        .values({
          userId: job.userId,
          kind: 'collect',
          deduplicationKey: `collect:clone:${job.id}`,
        })
        .onConflictDoNothing();
  } catch (error) {
    const uncertain =
      brandWriteAcknowledged ||
      (sent && !(error instanceof ShopeeApiError && error.reason === 'rejected'));
    await db
      .update(storeAutomationJobs)
      .set({
        status: uncertain ? 'unknown' : 'blocked',
        failure: uncertain ? 'uncertain' : 'unavailable',
        leaseUntil: null,
      })
      .where(
        and(
          eq(storeAutomationJobs.id, job.id),
          inArray(storeAutomationJobs.status, ['running', 'unknown']),
        ),
      );
  }
  return true;
}

export async function reconcileStoreChange(
  userId: string,
  id: string,
  fetcher: typeof fetch = fetch,
) {
  const [job] = await db
    .select()
    .from(storeAutomationJobs)
    .where(
      and(
        eq(storeAutomationJobs.userId, userId),
        eq(storeAutomationJobs.id, id),
        eq(storeAutomationJobs.status, 'unknown'),
      ),
    );
  if (!job) return false;
  const config = await assertAssistantAccess(userId, job.kind === 'brand' ? 'loja-pronta' : 'sll');
  const access = await readShopeeAccess(userId, config, fetcher);
  if (String(access.shopId) !== job.shopId || shopeeApplicationId(config) !== job.applicationId)
    return false;
  let current: Record<string, unknown>;
  if (job.kind === 'clone') {
    const desired = listingCloneSchema.parse(job.payload).template;
    let found:
      { item_id: number; item_sku: string; item_name: string; item_status: string } | undefined;
    for (let offset = 0, page = 0; page < 100; page++) {
      const list = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_list',
        z.object({
          item: z.array(z.object({ item_id: z.number() })),
          has_next_page: z.boolean(),
          next_offset: z.number().optional(),
        }),
        { offset: String(offset), page_size: '100', item_status: 'NORMAL' },
        fetcher,
      );
      for (let start = 0; start < list.item.length; start += 50) {
        const ids = list.item.slice(start, start + 50).map((row) => row.item_id);
        const base = await readShopeeResource(
          config,
          access,
          '/api/v2/product/get_item_base_info',
          z.object({
            item_list: z.array(
              z.object({
                item_id: z.number(),
                item_sku: z.string(),
                item_name: z.string(),
                item_status: z.string(),
              }),
            ),
          }),
          { item_id_list: ids.join(',') },
          fetcher,
        );
        const matches = base.item_list.filter(
          (row) =>
            row.item_sku === desired.item_sku &&
            row.item_name === desired.item_name &&
            row.item_status === 'NORMAL',
        );
        if (matches.length > 1 || (found && matches.length)) return false;
        if (matches[0]) found = matches[0];
      }
      if (!list.has_next_page) break;
      if (list.next_offset === undefined || list.next_offset <= offset || page === 99) return false;
      offset = list.next_offset;
    }
    if (!found || (job.result && job.result.itemId !== found.item_id)) return false;
    if (
      desired.variations &&
      !modelsMatchPublication(
        await readProductModels(config, access, found.item_id, fetcher),
        desired.variations,
      )
    )
      return false;
    await db
      .update(storeAutomationJobs)
      .set({
        status: 'completed',
        result: { itemId: found.item_id },
        completedAt: new Date(),
        failure: null,
      })
      .where(and(eq(storeAutomationJobs.id, job.id), eq(storeAutomationJobs.status, 'unknown')));
    await db
      .insert(assistantJobs)
      .values({ userId, kind: 'collect', deduplicationKey: `collect:clone:${job.id}` })
      .onConflictDoNothing();
    return true;
  }
  if (job.kind === 'brand')
    current = await readShopeeResource(
      config,
      access,
      '/api/v2/shop/get_profile',
      z.record(z.string(), z.unknown()),
      {},
      fetcher,
    );
  else {
    const itemId = listingChangeSchema.parse(job.payload).item_id;
    const response = await readShopeeResource(
      config,
      access,
      '/api/v2/product/get_item_base_info',
      z.object({ item_list: z.array(z.looseObject({ item_id: z.number() })) }),
      { item_id_list: String(itemId) },
      fetcher,
    );
    current = response.item_list.find((row) => row.item_id === itemId) ?? {};
  }
  if (!changeMatches(current, job.payload)) return false;
  await db
    .update(storeAutomationJobs)
    .set({ status: 'completed', completedAt: new Date(), failure: null })
    .where(and(eq(storeAutomationJobs.id, job.id), eq(storeAutomationJobs.status, 'unknown')));
  return true;
}

/** Só ativa modelos já confirmados; nunca repete criação de pai ou variações. */
export async function finishClonedVariations(
  userId: string,
  id: string,
  fetcher: typeof fetch = fetch,
) {
  const [job] = await db
    .select()
    .from(storeAutomationJobs)
    .where(
      and(
        eq(storeAutomationJobs.id, id),
        eq(storeAutomationJobs.userId, userId),
        eq(storeAutomationJobs.kind, 'clone'),
        eq(storeAutomationJobs.status, 'unknown'),
      ),
    );
  if (
    !job ||
    process.env.SHOPEE_PUBLICATION_ENABLED !== 'true' ||
    process.env.SHOPEE_DUPLICATION_ENABLED !== 'true'
  )
    return false;
  const config = await assertAssistantAccess(userId, 'sll');
  const access = await readShopeeAccess(userId, config, fetcher);
  if (String(access.shopId) !== job.shopId || shopeeApplicationId(config) !== job.applicationId)
    return false;
  const desired = listingCloneSchema.parse(job.payload).template;
  if (!desired.variations) return false;
  const matches = await findSku(config, access, desired.item_sku, fetcher);
  const matched = matches[0];
  if (
    matches.length !== 1 ||
    !matched ||
    matched.item_name !== desired.item_name ||
    (job.result && job.result.itemId !== matched.item_id)
  )
    return false;
  if (
    !modelsMatchPublication(
      await readProductModels(config, access, matched.item_id, fetcher),
      desired.variations,
    )
  )
    return false;
  await assertAssistantAccess(userId, 'sll');
  await writeShopeeResource(
    config,
    access,
    '/api/v2/product/update_item',
    { item_id: matched.item_id, item_status: 'NORMAL' },
    z.object({}),
    fetcher,
  );
  await db
    .update(storeAutomationJobs)
    .set({
      status: 'completed',
      result: { itemId: matched.item_id },
      completedAt: new Date(),
      failure: null,
    })
    .where(and(eq(storeAutomationJobs.id, job.id), eq(storeAutomationJobs.status, 'unknown')));
  await db
    .insert(assistantJobs)
    .values({ userId, kind: 'collect', deduplicationKey: `collect:clone:${job.id}` })
    .onConflictDoNothing();
  return true;
}

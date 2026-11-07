import { and, asc, eq, gt, gte, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistedDeliveries,
  assistantPublicationBatches,
  shopeeConnections,
  storeBrand,
  stores,
  studentProducts,
  supplierCatalog,
  user,
} from '@/server/db/schema';
import { storage } from '@/server/storage';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { effectiveProductAccess } from '@/features/products/server/eligibility';
import {
  deliveryApprovalFingerprint,
  INITIAL_DELIVERY_SIZE,
  prepareDeliveryOffer,
  type DeliverySelection,
} from '../assisted-delivery';
import {
  fillDeliveryWorkbook,
  fitsDeliveryWorkbook,
  parseDeliveryWorkbookLayout,
} from '../delivery-workbook';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Reader = Pick<typeof db, 'select'>;
type Delivery = typeof assistedDeliveries.$inferSelect;

export function deliveryConfiguration() {
  const subaccount = process.env.SHOPEE_ASSISTED_SUBACCOUNT?.trim();
  const templateKey = process.env.SHOPEE_ASSISTED_TEMPLATE_KEY;
  const supplierId = process.env.SHOPEE_ASSISTED_SUPPLIER_ID;
  const layout = parseDeliveryWorkbookLayout(process.env.SHOPEE_ASSISTED_TEMPLATE_LAYOUT);
  if (
    !subaccount ||
    subaccount.length > 150 ||
    !templateKey ||
    !/^shopee-templates\/[\w-]+\.xlsx$/.test(templateKey) ||
    !supplierId ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(supplierId) ||
    !layout
  )
    return null;
  return { subaccount, templateKey, layout, supplierId };
}

export function newAssistedDeliveriesEnabled() {
  return (
    process.env.SHOPEE_ASSISTED_DELIVERY_ENABLED === 'true' &&
    process.env.SHOPEE_PUBLICATION_ENABLED !== 'true' &&
    process.env.SHOPEE_BRAND_PUBLICATION_ENABLED !== 'true' &&
    Boolean(deliveryConfiguration())
  );
}

function approvedBrand(brand: typeof storeBrand.$inferSelect | undefined) {
  if (!brand?.completedAt || !brand.name || !brand.description || !brand.logoImage) return null;
  const fingerprint = brandFingerprint(brand);
  if (fingerprint !== brand.publicationFingerprint) return null;
  return {
    name: brand.name,
    description: brand.description,
    logoImage: brand.logoImage,
    fingerprint,
  };
}

async function currentBrand(userId: string, executor: Reader = db) {
  const [brand] = await executor.select().from(storeBrand).where(eq(storeBrand.userId, userId));
  return approvedBrand(brand);
}

export async function ownAssistedDelivery(userId: string) {
  const [delivery] = await db
    .select()
    .from(assistedDeliveries)
    .where(eq(assistedDeliveries.userId, userId));
  return delivery ?? null;
}

async function deliverySuggestions(executor: Reader = db) {
  const config = deliveryConfiguration();
  if (!config) return [];
  const now = new Date();
  const offers = [];
  let cursor: string | undefined;
  do {
    const rows = await executor
      .select()
      .from(supplierCatalog)
      .where(
        and(
          eq(supplierCatalog.supplierId, config.supplierId),
          gte(supplierCatalog.updatedAt, new Date(now.getTime() - 15 * 60_000)),
          cursor ? gt(supplierCatalog.sku, cursor) : undefined,
        ),
      )
      .orderBy(asc(supplierCatalog.sku))
      .limit(100);
    for (const row of rows) {
      const offer = prepareDeliveryOffer(row.product, now);
      if (offer && fitsDeliveryWorkbook(offer, config.layout)) offers.push(offer);
      if (offers.length === INITIAL_DELIVERY_SIZE) return offers;
    }
    cursor = rows.length === 100 ? rows.at(-1)?.sku : undefined;
  } while (cursor);
  return offers;
}

export async function assistedDeliveryReview(userId: string) {
  const [brand, offers] = await Promise.all([currentBrand(userId), deliverySuggestions()]);
  return { brand, offers };
}

async function lockDeliveryUser(tx: Transaction, userId: string) {
  // Share the publication lock so the same shop cannot start both initial paths.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`assistant-publication:${userId}`}))`,
  );
}

export async function requestAssistedDelivery(userId: string, shopId: string, expected: string) {
  const config = deliveryConfiguration();
  if (!newAssistedDeliveriesEnabled() || !config) return false;
  const template = await storage().get(config.templateKey);
  if (!template) return false;
  return db.transaction(async (tx) => {
    await lockDeliveryUser(tx, userId);
    const [existing] = await tx
      .select()
      .from(assistedDeliveries)
      .where(eq(assistedDeliveries.userId, userId))
      .for('update');
    if (existing?.startedAt) return false;
    const [phase] = await tx.select().from(stores).where(eq(stores.userId, userId)).for('share');
    if (phase?.phase !== 4) return false;
    const [connectedShop] = await tx
      .select({ userId: shopeeConnections.userId })
      .from(shopeeConnections)
      .where(
        and(eq(shopeeConnections.shopId, Number(shopId)), isNull(shopeeConnections.revokedAt)),
      );
    if (connectedShop && connectedShop.userId !== userId) return false;
    const [batch] = await tx
      .select({ id: assistantPublicationBatches.id })
      .from(assistantPublicationBatches)
      .where(eq(assistantPublicationBatches.userId, userId))
      .limit(1);
    if (batch) return false;
    const brand = await currentBrand(userId, tx);
    const offers = await deliverySuggestions(tx);
    if (
      !brand ||
      offers.length !== INITIAL_DELIVERY_SIZE ||
      deliveryApprovalFingerprint(brand.fingerprint, offers) !== expected
    )
      return false;
    await fillDeliveryWorkbook(template, config.layout, offers);
    const selection: DeliverySelection[] = offers.map(({ supplierId, sku, fingerprint }) => ({
      supplierId,
      sku,
      fingerprint,
    }));
    const [saved] = await tx
      .insert(assistedDeliveries)
      .values({ userId, shopId, brand, selection })
      .onConflictDoUpdate({
        target: assistedDeliveries.userId,
        set: { shopId, brand, selection },
        setWhere: isNull(assistedDeliveries.startedAt),
      })
      .returning({ id: assistedDeliveries.id });
    return Boolean(saved);
  });
}

export async function cancelAssistedDelivery(userId: string) {
  return db.transaction(async (tx) => {
    await lockDeliveryUser(tx, userId);
    const [removed] = await tx
      .delete(assistedDeliveries)
      .where(and(eq(assistedDeliveries.userId, userId), isNull(assistedDeliveries.startedAt)))
      .returning({ id: assistedDeliveries.id });
    return Boolean(removed);
  });
}

function eligibleDeliveries(executor: Reader = db) {
  return executor
    .select({ delivery: assistedDeliveries })
    .from(assistedDeliveries)
    .innerJoin(user, eq(user.id, assistedDeliveries.userId))
    .innerJoin(
      studentProducts,
      and(eq(studentProducts.userId, user.id), eq(studentProducts.product, 'loja-pronta')),
    )
    .$dynamic();
}

const eligibleCustomer = and(
  sql`(${user.banned} is not true or ${user.banExpires} <= now())`,
  effectiveProductAccess(),
);

export async function listAssistedDeliveries() {
  const rows = await eligibleDeliveries()
    .where(eligibleCustomer)
    .orderBy(
      sql`${assistedDeliveries.completedAt} asc nulls first`,
      asc(assistedDeliveries.requestedAt),
    )
    .limit(100);
  return rows.map(({ delivery }) => delivery);
}

export async function eligibleDelivery(id: string, executor: Reader = db) {
  const [row] = await eligibleDeliveries(executor).where(
    and(eligibleCustomer, eq(assistedDeliveries.id, id)),
  );
  return row?.delivery ?? null;
}

async function approvedOffers(delivery: Delivery, executor: Reader = db) {
  const config = deliveryConfiguration();
  if (!config) return null;
  const remaining = delivery.selection.filter((_, index) => !delivery.itemIds[index]);
  if (!remaining.length) return null;
  const rows = await executor
    .select()
    .from(supplierCatalog)
    .where(
      or(
        ...remaining.map(({ supplierId, sku }) =>
          and(eq(supplierCatalog.supplierId, supplierId), eq(supplierCatalog.sku, sku)),
        ),
      ),
    );
  const now = new Date();
  const offers = remaining.flatMap((item) => {
    const row = rows.find(
      ({ supplierId, sku }) => supplierId === item.supplierId && sku === item.sku,
    );
    const offer = row && prepareDeliveryOffer(row.product, now);
    return offer?.fingerprint === item.fingerprint && fitsDeliveryWorkbook(offer, config.layout)
      ? [offer]
      : [];
  });
  return offers.length === remaining.length ? offers : null;
}

export async function deliveryReadiness(delivery: Delivery, executor: Reader = db) {
  if (!deliveryConfiguration()) return 'template';
  if (
    !delivery.startedAt &&
    (await currentBrand(delivery.userId, executor))?.fingerprint !== delivery.brand.fingerprint
  )
    return 'brand';
  return (await approvedOffers(delivery, executor)) ? 'ready' : 'offers';
}

export async function deliveryWorkbook(delivery: Delivery) {
  const config = deliveryConfiguration();
  const offers = await approvedOffers(delivery);
  if (!config || !offers) return null;
  const template = await storage().get(config.templateKey);
  return template ? fillDeliveryWorkbook(template, config.layout, offers) : null;
}

export async function claimAssistedDelivery(id: string, operatorId: string) {
  const delivery = await eligibleDelivery(id);
  if (!delivery || delivery.completedAt || delivery.operatorId) return false;
  const [workbook, logo] = await Promise.all([
    deliveryWorkbook(delivery),
    storage().get(delivery.brand.logoImage),
  ]);
  if (!workbook || !logo) return false;
  return db.transaction(async (tx) => {
    await lockDeliveryUser(tx, delivery.userId);
    const current = await eligibleDelivery(id, tx);
    if (
      !current ||
      current.operatorId ||
      current.completedAt ||
      current.shopId !== delivery.shopId ||
      deliveryApprovalFingerprint(current.brand.fingerprint, current.selection) !==
        deliveryApprovalFingerprint(delivery.brand.fingerprint, delivery.selection) ||
      (await deliveryReadiness(current, tx)) !== 'ready'
    )
      return false;
    const [saved] = await tx
      .update(assistedDeliveries)
      .set({ operatorId, startedAt: current.startedAt ?? new Date() })
      .where(and(eq(assistedDeliveries.id, id), isNull(assistedDeliveries.operatorId)))
      .returning({ id: assistedDeliveries.id });
    return Boolean(saved);
  });
}

export async function confirmAssistedItems(
  id: string,
  operatorId: string,
  entered: (string | null)[],
  brandApplied: boolean,
) {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(assistedDeliveries)
      .where(eq(assistedDeliveries.id, id))
      .for('update');
    if (!locked?.startedAt || locked.operatorId !== operatorId || locked.completedAt) return false;
    if (!(await eligibleDelivery(id, tx))) return false;
    const itemIds = locked.itemIds.map((previous, index) => previous ?? entered[index] ?? null);
    const confirmed = itemIds.filter((item) => item !== null);
    if (!confirmed.length || new Set(confirmed).size !== confirmed.length) return false;
    await tx
      .update(assistedDeliveries)
      .set({
        itemIds,
        completedAt: brandApplied && confirmed.length === INITIAL_DELIVERY_SIZE ? new Date() : null,
      })
      .where(eq(assistedDeliveries.id, id));
    return true;
  });
}

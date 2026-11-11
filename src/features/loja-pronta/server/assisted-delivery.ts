import { and, asc, eq, gt, gte, isNull, ne, or, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
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
  parseAssistedDeliveryPilot,
  prepareDeliveryOffer,
  type DeliverySelection,
  type MemberAccess,
} from '../assisted-delivery';
import {
  fillDeliveryWorkbook,
  fitsDeliveryWorkbook,
  parseDeliveryWorkbookLayout,
} from '../delivery-workbook';
import { decryptMemberPassword, encryptMemberPassword } from './member-secret';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Reader = Pick<typeof db, 'select'>;
type Delivery = typeof assistedDeliveries.$inferSelect;

export function deliveryReconciliationFingerprint(delivery: Delivery) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        delivery.id,
        delivery.operatorId,
        delivery.selection.map(({ fingerprint }) => fingerprint),
        delivery.itemIds,
        delivery.offerReviewId,
      ]),
    )
    .digest('hex');
}

export function deliveryConfiguration() {
  const templateKey = process.env.SHOPEE_ASSISTED_TEMPLATE_KEY;
  const supplierId = process.env.SHOPEE_ASSISTED_SUPPLIER_ID;
  const layout = parseDeliveryWorkbookLayout(process.env.SHOPEE_ASSISTED_TEMPLATE_LAYOUT);
  if (
    !templateKey ||
    !/^shopee-templates\/[\w-]+\.xlsx$/.test(templateKey) ||
    !supplierId ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(supplierId) ||
    !layout
  )
    return null;
  return { templateKey, layout, supplierId };
}

export function newAssistedDeliveryPilot() {
  if (
    process.env.SHOPEE_ASSISTED_DELIVERY_ENABLED !== 'true' ||
    process.env.SHOPEE_PUBLICATION_ENABLED === 'true' ||
    process.env.SHOPEE_BRAND_PUBLICATION_ENABLED === 'true'
  )
    return null;
  const config = deliveryConfiguration();
  const pilot = parseAssistedDeliveryPilot(
    process.env.SHOPEE_ASSISTED_PILOT_USER_ID,
    process.env.SHOPEE_ASSISTED_PILOT_SHOP_URL,
  );
  return config && pilot ? { ...config, ...pilot } : null;
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

function remainingSelection(delivery: Delivery) {
  return delivery.selection.filter((_, index) => !delivery.itemIds[index]);
}

async function deliverySuggestions(executor: Reader = db, delivery?: Delivery) {
  const config = deliveryConfiguration();
  if (!config) return [];
  const now = new Date();
  const count = delivery ? remainingSelection(delivery).length : INITIAL_DELIVERY_SIZE;
  if (!count) return [];
  const published = new Set(
    delivery?.selection.filter((_, index) => delivery.itemIds[index]).map(({ sku }) => sku),
  );
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
      if (offer && !published.has(offer.sku) && fitsDeliveryWorkbook(offer, config.layout))
        offers.push(offer);
      if (offers.length === count) return offers;
    }
    cursor = rows.length === 100 ? rows.at(-1)?.sku : undefined;
  } while (cursor);
  return offers;
}

export async function assistedDeliveryReview(userId: string, delivery?: Delivery) {
  const [brand, offers] = await Promise.all([
    delivery ? delivery.brand : currentBrand(userId),
    deliverySuggestions(db, delivery),
  ]);
  return {
    brand,
    offers,
    count: delivery ? remainingSelection(delivery).length : INITIAL_DELIVERY_SIZE,
  };
}

async function lockDeliveryUser(tx: Transaction, userId: string) {
  // Share the publication lock so the same shop cannot start both initial paths.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`assistant-publication:${userId}`}))`,
  );
}

export async function requestAssistedDelivery(
  userId: string,
  shopId: string,
  expected: string,
  access?: MemberAccess,
) {
  const pilot = newAssistedDeliveryPilot();
  const initial = pilot?.userId === userId && pilot.shopId === shopId;
  const pending = await ownAssistedDelivery(userId);
  const config = initial ? pilot : deliveryConfiguration();
  if (!config || (!initial && !(pending?.offerReviewId && pending.shopId === shopId))) return false;
  const template = await storage().get(config.templateKey);
  if (!template) return false;
  return db.transaction(async (tx) => {
    await lockDeliveryUser(tx, userId);
    const [existing] = await tx
      .select()
      .from(assistedDeliveries)
      .where(eq(assistedDeliveries.userId, userId))
      .for('update');
    if (existing?.offerReviewId) {
      if (
        existing.shopId !== shopId ||
        existing.completedAt ||
        existing.operatorId ||
        !(await eligibleDelivery(existing.id, tx))
      )
        return false;
      const offers = await deliverySuggestions(tx, existing);
      if (
        !offers.length ||
        offers.length !== remainingSelection(existing).length ||
        deliveryApprovalFingerprint(existing.brand.fingerprint, offers, existing.offerReviewId) !==
          expected
      )
        return false;
      await fillDeliveryWorkbook(template, config.layout, offers);
      const selection = offers.map(({ supplierId, sku, fingerprint }) => ({
        supplierId,
        sku,
        fingerprint,
      }));
      let next = 0;
      await tx
        .update(assistedDeliveries)
        .set({
          selection: existing.selection.map((item, index) =>
            existing.itemIds[index] ? item : selection[next++]!,
          ),
          offerReviewId: null,
        })
        .where(eq(assistedDeliveries.id, existing.id));
      return true;
    }
    if (!initial || !access) return false;
    if (existing?.startedAt) return false;
    const [phase] = await tx.select().from(stores).where(eq(stores.userId, userId)).for('share');
    if (phase?.phase !== 4) return false;
    const [connectedShop] = await tx
      .select({ userId: shopeeConnections.userId })
      .from(shopeeConnections)
      .where(
        and(
          eq(shopeeConnections.shopId, Number(shopId)),
          ne(shopeeConnections.userId, userId),
          sql`${shopeeConnections.applicationId} not like 'sandbox:%'`,
          isNull(shopeeConnections.revokedAt),
        ),
      );
    if (connectedShop) return false;
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
    const member = {
      memberLogin: access.login,
      memberPassword: encryptMemberPassword(access.password, userId, shopId),
    };
    const [saved] = await tx
      .insert(assistedDeliveries)
      .values({ userId, shopId, brand, selection, ...member })
      .onConflictDoUpdate({
        target: assistedDeliveries.userId,
        set: { shopId, brand, selection, ...member },
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
  if (delivery.offerReviewId) return null;
  const remaining = remainingSelection(delivery);
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
  if (delivery.offerReviewId) return 'review';
  if (!remainingSelection(delivery).length) return 'ready';
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
  if (!delivery || delivery.completedAt || delivery.operatorId || delivery.offerReviewId)
    return false;
  const needsWorkbook = remainingSelection(delivery).length > 0;
  const [workbook, logo] = await Promise.all([
    needsWorkbook ? deliveryWorkbook(delivery) : true,
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
      current.offerReviewId ||
      current.shopId !== delivery.shopId ||
      deliveryApprovalFingerprint(current.brand.fingerprint, current.selection) !==
        deliveryApprovalFingerprint(delivery.brand.fingerprint, delivery.selection) ||
      (await deliveryReadiness(current, tx)) !== 'ready'
    )
      return false;
    const [saved] = await tx
      .update(assistedDeliveries)
      .set({ operatorId, startedAt: current.startedAt ?? new Date() })
      .where(
        and(
          eq(assistedDeliveries.id, id),
          isNull(assistedDeliveries.operatorId),
          isNull(assistedDeliveries.offerReviewId),
        ),
      )
      .returning({ id: assistedDeliveries.id });
    return Boolean(saved);
  });
}

/** Release a claimed delivery after the administrator reconciles any upload in the Seller Centre. */
export async function releaseAssistedDelivery(id: string, expected: string, review: boolean) {
  return db.transaction(async (tx) => {
    const [delivery] = await tx
      .select()
      .from(assistedDeliveries)
      .where(eq(assistedDeliveries.id, id))
      .for('update');
    if (
      !delivery?.startedAt ||
      delivery.completedAt ||
      delivery.offerReviewId ||
      deliveryReconciliationFingerprint(delivery) !== expected ||
      !(await eligibleDelivery(id, tx))
    )
      return false;
    if (
      review &&
      (!remainingSelection(delivery).length || (await deliveryReadiness(delivery, tx)) !== 'offers')
    )
      return false;
    if (!review && !delivery.operatorId) return false;
    await tx
      .update(assistedDeliveries)
      .set({
        operatorId: null,
        offerReviewId: review ? randomUUID() : null,
      })
      .where(eq(assistedDeliveries.id, id));
    return true;
  });
}

export async function confirmAssistedItems(
  id: string,
  operatorId: string,
  expected: string,
  entered: (string | null)[],
  brandApplied: boolean,
  administrator = false,
) {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(assistedDeliveries)
      .where(eq(assistedDeliveries.id, id))
      .for('update');
    if (
      !locked?.startedAt ||
      (!administrator && locked.operatorId !== operatorId) ||
      deliveryReconciliationFingerprint(locked) !== expected ||
      locked.completedAt ||
      locked.offerReviewId
    )
      return false;
    if (!(await eligibleDelivery(id, tx))) return false;
    const itemIds = locked.itemIds.map((previous, index) => previous ?? entered[index] ?? null);
    const confirmed = itemIds.filter((item) => item !== null);
    if (!confirmed.length || new Set(confirmed).size !== confirmed.length) return false;
    const completed = brandApplied && confirmed.length === INITIAL_DELIVERY_SIZE;
    await tx
      .update(assistedDeliveries)
      .set({
        itemIds,
        completedAt: completed ? new Date() : null,
        // Entrega concluída: a senha do membro não serve mais pra nada aqui.
        ...(completed ? { memberPassword: null } : {}),
      })
      .where(eq(assistedDeliveries.id, id));
    return true;
  });
}

/** O acesso de membro pra quem publica a entrega. Senha ilegível vira "sem acesso", sem erro. */
export function deliveryMemberAccess(delivery: Delivery) {
  if (!delivery.memberLogin) return null;
  let password: string | null = null;
  if (delivery.memberPassword) {
    try {
      password = decryptMemberPassword(delivery.memberPassword, delivery.userId, delivery.shopId);
    } catch {
      password = null;
    }
  }
  return { login: delivery.memberLogin, password };
}

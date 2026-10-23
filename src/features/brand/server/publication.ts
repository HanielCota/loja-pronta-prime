import sharp from 'sharp';
import { and, eq, isNotNull, isNull, notExists, inArray, sql, or, exists } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  storeBrand,
  shopeeConnections,
  storeAutomationJobs,
  user,
  studentProducts,
} from '@/server/db/schema';
import { storage } from '@/server/storage';
import { shopeeApplicationId } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { uploadShopeeMedia } from '@/features/shopee/server/resources';
import { assertAssistantAccess } from '@/features/assistant/server/metrics';
import { queueStoreChange, reconcileStoreChange } from '@/features/assistant/server/store-changes';
import { effectiveProductAccess } from '@/features/products/server/eligibility';
import { brandPublicationEnabled } from './publication-settings';
import { brandFingerprint } from './fingerprint';

/** Only a confirmed, unchanged snapshot can reach the remote write queue. */
export async function queueApprovedBrand(
  userId: string,
  fetcher: typeof fetch = fetch,
  readLogo = (key: string) => storage().get(key),
) {
  if (!brandPublicationEnabled()) throw new Error('Envio da marca indisponível.');
  const [brand] = await db.select().from(storeBrand).where(eq(storeBrand.userId, userId));
  if (
    !brand?.completedAt ||
    !brand.name ||
    !brand.description ||
    !brand.logoImage ||
    brand.publicationFingerprint !== brandFingerprint(brand)
  )
    throw new Error('Confirme a marca atual.');
  const config = await assertAssistantAccess(userId, 'loja-pronta');
  const access = await readShopeeAccess(userId, config, fetcher);
  const [existing] = await db
    .select({ id: storeAutomationJobs.id })
    .from(storeAutomationJobs)
    .where(
      and(
        eq(storeAutomationJobs.userId, userId),
        eq(storeAutomationJobs.kind, 'brand'),
        eq(storeAutomationJobs.shopId, String(access.shopId)),
        eq(storeAutomationJobs.applicationId, shopeeApplicationId(config)),
        eq(storeAutomationJobs.sourceFingerprint, brand.publicationFingerprint),
      ),
    );
  if (existing) return existing.id;
  const logo = await readLogo(brand.logoImage);
  if (!logo) throw new Error('Logo indisponível.');
  const bytes = await sharp(logo, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(512, 512, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 90 })
    .toBuffer();
  const uploaded = await uploadShopeeMedia(config, access, bytes, fetcher);
  if (!uploaded.url) throw new Error('Imagem não confirmada pela Shopee.');
  return queueStoreChange(
    userId,
    'brand',
    {
      shop_name: brand.name,
      description: brand.description,
      shop_logo: uploaded.url,
    },
    brand.publicationFingerprint,
  );
}

/** Reconciliation also covers brands confirmed before a connection or while writes were disabled. */
export async function queueAutomaticBrands(
  fetcher: typeof fetch = fetch,
  readLogo?: (key: string) => Promise<Uint8Array | null>,
) {
  const config = getShopeeConfiguration();
  if (
    !brandPublicationEnabled() ||
    !config ||
    config.SHOPEE_ENVIRONMENT !== 'live' ||
    config.SHOPEE_ENABLED !== 'true'
  )
    return 0;
  const uncertain = await db
    .select({ id: storeAutomationJobs.id, userId: storeAutomationJobs.userId })
    .from(storeAutomationJobs)
    .where(
      and(
        eq(storeAutomationJobs.kind, 'brand'),
        eq(storeAutomationJobs.applicationId, shopeeApplicationId(config)),
        eq(storeAutomationJobs.status, 'unknown'),
      ),
    )
    .limit(50);
  for (const job of uncertain) {
    try {
      await reconcileStoreChange(job.userId, job.id, fetcher);
    } catch {
      /* Read-only reconciliation never resends a write. */
    }
  }
  const pilot = config.SHOPEE_PILOT_USER_IDS.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const candidates = await db
    .select({ userId: storeBrand.userId })
    .from(storeBrand)
    .innerJoin(shopeeConnections, eq(shopeeConnections.userId, storeBrand.userId))
    .innerJoin(user, eq(user.id, storeBrand.userId))
    .where(
      and(
        pilot.length
          ? or(inArray(user.id, pilot), sql`${user.role} ~ '(^|,)admin(,|$)'`)
          : undefined,
        exists(
          db
            .select({ userId: studentProducts.userId })
            .from(studentProducts)
            .where(
              and(
                eq(studentProducts.userId, storeBrand.userId),
                eq(studentProducts.product, 'loja-pronta'),
                effectiveProductAccess(),
              ),
            ),
        ),
        notExists(
          db
            .select({ id: storeAutomationJobs.id })
            .from(storeAutomationJobs)
            .where(
              and(
                eq(storeAutomationJobs.userId, storeBrand.userId),
                eq(storeAutomationJobs.kind, 'brand'),
                inArray(storeAutomationJobs.status, ['pending', 'running', 'unknown']),
              ),
            ),
        ),
        isNotNull(storeBrand.completedAt),
        isNotNull(storeBrand.publicationFingerprint),
        isNotNull(storeBrand.logoImage),
        isNotNull(storeBrand.name),
        isNotNull(storeBrand.description),
        isNull(shopeeConnections.revokedAt),
        eq(shopeeConnections.applicationId, shopeeApplicationId(config)),
        or(eq(user.banned, false), isNull(user.banned)),
        eq(user.mustChangePassword, false),
        notExists(
          db
            .select({ id: storeAutomationJobs.id })
            .from(storeAutomationJobs)
            .where(
              and(
                eq(storeAutomationJobs.userId, storeBrand.userId),
                eq(storeAutomationJobs.kind, 'brand'),
                eq(storeAutomationJobs.applicationId, shopeeConnections.applicationId),
                sql`${storeAutomationJobs.shopId} = ${shopeeConnections.shopId}::text`,
                eq(storeAutomationJobs.sourceFingerprint, storeBrand.publicationFingerprint),
              ),
            ),
        ),
      ),
    )
    .limit(50);
  let queued = 0;
  for (const candidate of candidates) {
    // The queue checks access again immediately before preparation.
    try {
      await queueApprovedBrand(candidate.userId, fetcher, readLogo);
      queued++;
    } catch {
      /* A later scan retries preparation, never an uncertain remote write. */
    }
  }
  return queued;
}

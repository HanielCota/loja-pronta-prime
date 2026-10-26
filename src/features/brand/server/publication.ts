import sharp from 'sharp';
import {
  and,
  asc,
  eq,
  gt,
  isNotNull,
  isNull,
  notExists,
  inArray,
  sql,
  or,
  exists,
} from 'drizzle-orm';
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
import { nextScanCursor } from '../scan-cursor';

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

/** Itens por varredura de cada fila (o worker varre a cada minuto). */
const BRAND_SCAN_SIZE = 50;

/**
 * Onde cada fila continua na próxima varredura. Sem ordem nem cursor, as mesmas 50 linhas que
 * falham sempre (token vencido, logo apagado) voltavam em toda varredura e as marcas depois delas
 * nunca eram enviadas. Fica na memória do worker: reiniciar só recomeça do começo.
 */
const scanCursor = { uncertain: '', candidates: '' };

/** Só a etapa e o tipo do erro: a mensagem crua pode trazer tokens ou dados da aluna. */
function reportBrandQueueFailure(stage: 'reconcile' | 'prepare', error: unknown) {
  const kind = error instanceof Error ? error.name : typeof error;
  console.error(`[brand] ${stage} falhou: ${kind}`);
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
        scanCursor.uncertain ? gt(storeAutomationJobs.id, scanCursor.uncertain) : undefined,
      ),
    )
    .orderBy(asc(storeAutomationJobs.id))
    .limit(BRAND_SCAN_SIZE);
  scanCursor.uncertain = nextScanCursor(
    uncertain.map((job) => job.id),
    BRAND_SCAN_SIZE,
  );
  for (const job of uncertain) {
    try {
      await reconcileStoreChange(job.userId, job.id, fetcher);
    } catch (error) {
      // Read-only reconciliation never resends a write; the next scan tries again.
      reportBrandQueueFailure('reconcile', error);
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
        scanCursor.candidates ? gt(storeBrand.userId, scanCursor.candidates) : undefined,
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
    .orderBy(asc(storeBrand.userId))
    .limit(BRAND_SCAN_SIZE);
  scanCursor.candidates = nextScanCursor(
    candidates.map((candidate) => candidate.userId),
    BRAND_SCAN_SIZE,
  );
  let queued = 0;
  for (const candidate of candidates) {
    // The queue checks access again immediately before preparation.
    try {
      await queueApprovedBrand(candidate.userId, fetcher, readLogo);
      queued++;
    } catch (error) {
      // A later scan retries preparation, never an uncertain remote write. Sem o registro, uma
      // marca que falha sempre (logo sumido no bucket, token morto) ficava invisível na fila.
      reportBrandQueueFailure('prepare', error);
    }
  }
  return queued;
}

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { importedProduct } from './catalog-data';
import { legacyRecordHash } from '../recovery';
import {
  publicationLocked,
  recoveredPublicationFingerprint,
  recoveredPublicationOffer,
  recoveredBarcodes,
  RECOVERED_REVIEW_TTL,
  type PublicationContext,
  type RecoveredListingPayload,
  type RecoveredPublicationIntent,
  type RecoveredPublicationStatus,
} from '../publication';

type Client = Pick<PoolClient, 'query'>;
export type RecoveredPublication = {
  id: string;
  import_id: string;
  user_id: string;
  application_id: string;
  shop_id: number;
  review_expired: boolean;
  status: RecoveredPublicationStatus;
  context: PublicationContext;
  intent: RecoveredPublicationIntent | null;
  fingerprint: string | null;
  expires_at: Date | null;
  confirmed_at: Date | null;
  payload: RecoveredListingPayload | null;
  item_id: number | null;
  failure: string | null;
  lease_id: string | null;
  lease_until: Date | null;
};
export async function recoveredPublication(client: Client, userId: string, productId: string) {
  const imported = await importedProduct(client, userId, productId);
  if (!imported) return null;
  const {
    rows: [row],
  } = await client.query<RecoveredPublication>(
    'SELECT *,expires_at<=now() review_expired FROM legacy_catalog_publications WHERE user_id=$1 AND import_id=$2',
    [userId, imported.id],
  );
  return row
    ? { ...row, shop_id: Number(row.shop_id), item_id: row.item_id ? Number(row.item_id) : null }
    : null;
}

/** All review, edit and confirmation writers serialize on the imported row. */
async function locked<T>(
  pool: Pick<Pool, 'connect'>,
  userId: string,
  productId: string,
  work: (
    client: PoolClient,
    imported: NonNullable<Awaited<ReturnType<typeof importedProduct>>>,
  ) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT id FROM legacy_catalog_imports WHERE user_id=$1 AND product_id=$2::uuid FOR UPDATE',
      [userId, productId],
    );
    const imported = await importedProduct(client, userId, productId);
    if (!imported) throw new Error('O produto não está disponível para esta conta.');
    const result = await work(client, imported);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveRecoveredPublicationOptions(
  pool: Pick<Pool, 'connect'>,
  userId: string,
  productId: string,
  applicationId: string,
  shopId: number,
  context: PublicationContext,
) {
  return locked(pool, userId, productId, async (client, imported) => {
    const existing = await recoveredPublication(client, userId, productId);
    if (existing && publicationLocked(existing.status)) return existing;
    const {
      rows: [row],
    } = await client.query<RecoveredPublication>(
      `INSERT INTO legacy_catalog_publications(import_id,user_id,application_id,shop_id,context) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(import_id) DO UPDATE SET application_id=excluded.application_id,shop_id=excluded.shop_id,context=excluded.context,status='editing',intent=null,fingerprint=null,expires_at=null,confirmed_at=null,payload=null,failure=null,lease_id=null,lease_until=null,updated_at=now()
      WHERE legacy_catalog_publications.status in ('editing','review','blocked') RETURNING *`,
      [imported.id, userId, applicationId, shopId, JSON.stringify(context)],
    );
    return row;
  });
}

export async function reviewRecoveredPublication(
  pool: Pick<Pool, 'connect'>,
  userId: string,
  productId: string,
  expectedRevision: number,
  expectedPublicationId: string,
  form: FormData,
  now = new Date(),
) {
  return locked(pool, userId, productId, async (client, imported) => {
    const row = await recoveredPublication(client, userId, productId);
    if (
      !row ||
      row.id !== expectedPublicationId ||
      row.status !== 'editing' ||
      form.get('optionsVersion') !== row.context.version ||
      imported.revision !== expectedRevision
    )
      throw new Error('O produto mudou. Reabra a preparação e confira os dados.');
    let offer;
    try {
      offer = recoveredPublicationOffer(imported.product, row.context, form, now);
    } catch (error) {
      const values: Record<string, string[]> = {};
      for (const key of form.keys()) {
        if (
          !/^(?:cost|stock|weightGrams|length|width|height|brandId|channelId|(?:cost|price|stock|barcode|noBarcode)-\d{1,3}|attribute-\d{1,16})$/.test(
            key,
          )
        )
          continue;
        values[key] = form
          .getAll(key)
          .slice(0, 20)
          .map((value) => String(value).slice(0, 500));
      }
      const problem =
        error instanceof z.ZodError
          ? 'Preencha os valores em reais, as quantidades e as medidas nos campos indicados.'
          : 'Confira o estoque, mantenha cada preço acima do custo e confirme os dados atuais. As variações precisam ter todas as combinações recuperadas.';
      await client.query(
        'UPDATE legacy_catalog_publications SET context=$2,updated_at=now() WHERE id=$1',
        [row.id, JSON.stringify({ ...row.context, values, problem })],
      );
      return false;
    }
    const intent: RecoveredPublicationIntent = {
      offer,
      barcodes: recoveredBarcodes(offer, row.context, form),
      productHash: legacyRecordHash(imported.product),
      sourceHash: imported.source_hash,
      revision: imported.revision,
    };
    const expiresAt = new Date(now.getTime() + RECOVERED_REVIEW_TTL);
    const fingerprint = recoveredPublicationFingerprint({
      importId: row.import_id,
      applicationId: row.application_id,
      shopId: row.shop_id,
      context: row.context,
      intent,
      expiresAt,
    });
    await client.query(
      "UPDATE legacy_catalog_publications SET status='review',intent=$2,fingerprint=$3,expires_at=$4,updated_at=now() WHERE id=$1",
      [row.id, JSON.stringify(intent), fingerprint, expiresAt],
    );
    return true;
  });
}

export async function confirmRecoveredPublication(
  pool: Pick<Pool, 'connect'>,
  userId: string,
  productId: string,
  fingerprint: string,
  applicationId: string,
  shopId: number,
  now = new Date(),
) {
  return locked(pool, userId, productId, async (client, imported) => {
    const row = await recoveredPublication(client, userId, productId);
    if (
      !row ||
      row.fingerprint !== fingerprint ||
      row.application_id !== applicationId ||
      row.shop_id !== shopId ||
      !row.intent ||
      !row.expires_at
    )
      return false;
    if (['pending', 'preparing', 'sending', 'published', 'unknown'].includes(row.status))
      return true;
    if (
      row.status !== 'review' ||
      row.expires_at <= now ||
      row.intent.revision !== imported.revision ||
      row.intent.sourceHash !== imported.source_hash ||
      row.intent.productHash !== legacyRecordHash(imported.product)
    )
      return false;
    if (
      fingerprint !==
      recoveredPublicationFingerprint({
        importId: row.import_id,
        applicationId,
        shopId,
        context: row.context,
        intent: row.intent,
        expiresAt: row.expires_at,
      })
    )
      return false;
    const saved = await client.query(
      "UPDATE legacy_catalog_publications SET status='pending',confirmed_at=$2,updated_at=now() WHERE id=$1 AND status='review' RETURNING id",
      [row.id, now],
    );
    return saved.rowCount === 1;
  });
}

export async function claimRecoveredPublication(pool: Pick<Pool, 'connect'>, now = new Date()) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // No automatic listing retry after a write may have reached Shopee.
    await client.query(
      "UPDATE legacy_catalog_publications SET status=case when status='sending' then 'unknown' else 'blocked' end,failure='interrupted',lease_id=null,lease_until=null,updated_at=now() WHERE status in ('preparing','sending') AND lease_until<$1",
      [now],
    );
    const {
      rows: [row],
    } = await client.query<RecoveredPublication>(
      `WITH candidate AS (SELECT id FROM legacy_catalog_publications WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE legacy_catalog_publications p SET status='preparing',lease_id=$1,lease_until=$2,updated_at=now() FROM candidate c WHERE p.id=c.id RETURNING p.*`,
      [randomUUID(), new Date(now.getTime() + 10 * 60 * 1000)],
    );
    await client.query('COMMIT');
    return row
      ? { ...row, shop_id: Number(row.shop_id), item_id: row.item_id ? Number(row.item_id) : null }
      : null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

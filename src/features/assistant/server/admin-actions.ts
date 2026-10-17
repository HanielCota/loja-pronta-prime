'use server';

import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { and, eq, lt, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import {
  assistantJobs,
  assistantPublicationItems,
  shopeeConnections,
  supplierCatalog,
  supplierPublicationMappings,
} from '@/server/db/schema';
import { supplierProductSchema } from '@/features/shopee/catalog';
import { publicationPayloadSchema } from '../model';
import { reconcilePublicationItem } from './operations';

export async function retryAssistantJob(form: FormData): Promise<void> {
  await requireAdmin('/admin/assistente');
  const id = z.uuid().safeParse(form.get('jobId'));
  if (!id.success) redirect('/admin/assistente?resultado=invalid');
  await db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(assistantJobs)
      .where(and(eq(assistantJobs.id, id.data), eq(assistantJobs.status, 'blocked')))
      .for('update');
    if (!job) return;
    if (job.kind === 'publish') {
      const [item] = await tx
        .select()
        .from(assistantPublicationItems)
        .where(eq(assistantPublicationItems.id, job.payload.itemId ?? ''))
        .for('update');
      // Resultado incerto nunca passa por este botão de repetição.
      if (!item || !['pending', 'failed'].includes(item.status)) return;
      const [mapping] = await tx
        .select()
        .from(supplierPublicationMappings)
        .where(
          and(
            eq(supplierPublicationMappings.userId, item.userId),
            eq(supplierPublicationMappings.supplierId, item.supplierId),
            eq(supplierPublicationMappings.sku, item.sku),
            eq(supplierPublicationMappings.shopId, item.shopId),
            eq(supplierPublicationMappings.applicationId, item.applicationId),
          ),
        );
      const corrected = publicationPayloadSchema.safeParse(mapping?.payload);
      // A correção não muda o preço, a quantidade ou o SKU que a aluna autorizou.
      if (
        corrected.success &&
        corrected.data.item_sku === item.payload.item_sku &&
        corrected.data.original_price === item.payload.original_price &&
        corrected.data.normal_stock === item.payload.normal_stock
      )
        await tx
          .update(assistantPublicationItems)
          .set({ payload: corrected.data })
          .where(eq(assistantPublicationItems.id, item.id));
    }
    await tx
      .update(assistantJobs)
      .set({ status: 'pending', runAt: new Date(), leaseUntil: null, failure: null })
      .where(eq(assistantJobs.id, id.data));
  });
  revalidatePath('/admin/assistente');
  redirect('/admin/assistente?resultado=saved');
}

export async function reconcileAssistantPublication(form: FormData): Promise<void> {
  await requireAdmin('/admin/assistente');
  const id = z.uuid().safeParse(form.get('itemId'));
  if (!id.success) redirect('/admin/assistente?resultado=invalid');
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(eq(assistantPublicationItems.id, id.data));
  if (!item) redirect('/admin/assistente?resultado=invalid');
  let result = 'unavailable';
  try {
    result = (await reconcilePublicationItem(item.userId, item.id)).status;
  } catch {
    /* A tela não recebe mensagens externas com dados da conta. */
  }
  revalidatePath('/admin/assistente');
  redirect(`/admin/assistente?resultado=${result}`);
}

export async function importSupplierCatalog(form: FormData): Promise<void> {
  const session = await requireAdmin('/admin/assistente');
  const file = form.get('catalog');
  const targetUserId = String(form.get('targetUserId') ?? '').trim();
  if (!(file instanceof File) || file.size < 1 || file.size > 2_000_000)
    redirect('/admin/assistente?resultado=invalid');
  let input: unknown;
  try {
    input = JSON.parse(await file.text());
  } catch {
    redirect('/admin/assistente?resultado=invalid');
  }
  const parsed = z
    .array(
      z.object({
        product: supplierProductSchema,
        publication: publicationPayloadSchema.optional(),
      }),
    )
    .min(1)
    .max(1000)
    .safeParse(input);
  if (!parsed.success) redirect('/admin/assistente?resultado=invalid');
  const keys = parsed.data.map((row) => JSON.stringify([row.product.supplierId, row.product.sku]));
  if (new Set(keys).size !== keys.length) redirect('/admin/assistente?resultado=invalid');
  if (parsed.data.some((row) => Date.parse(row.product.updatedAt) > Date.now()))
    redirect('/admin/assistente?resultado=invalid');
  const hasMappings = parsed.data.some((row) => row.publication);
  const [connection] = targetUserId
    ? await db
        .select()
        .from(shopeeConnections)
        .where(
          and(
            eq(shopeeConnections.userId, targetUserId),
            sql`${shopeeConnections.revokedAt} is null`,
          ),
        )
    : [];
  if (hasMappings && (!connection || form.get('confirmed') !== 'true'))
    redirect('/admin/assistente?resultado=confirmation-required');
  for (const row of parsed.data)
    if (
      row.publication &&
      (row.publication.item_sku !== row.product.sku ||
        Math.round(row.publication.original_price * 100) !== row.product.priceCents ||
        row.publication.normal_stock > row.product.stock)
    )
      redirect('/admin/assistente?resultado=invalid');
  const ignored = await db.transaction(async (tx) => {
    let skipped = 0;
    for (const row of parsed.data.toSorted((a, b) =>
      JSON.stringify([a.product.supplierId, a.product.sku]).localeCompare(
        JSON.stringify([b.product.supplierId, b.product.sku]),
      ),
    )) {
      await tx
        .insert(supplierCatalog)
        .values({
          supplierId: row.product.supplierId,
          sku: row.product.sku,
          product: row.product,
          updatedAt: new Date(row.product.updatedAt),
        })
        .onConflictDoUpdate({
          target: [supplierCatalog.supplierId, supplierCatalog.sku],
          set: { product: row.product, updatedAt: new Date(row.product.updatedAt) },
          setWhere: lt(supplierCatalog.updatedAt, new Date(row.product.updatedAt)),
        });
      const [current] = await tx
        .select()
        .from(supplierCatalog)
        .where(
          and(
            eq(supplierCatalog.supplierId, row.product.supplierId),
            eq(supplierCatalog.sku, row.product.sku),
          ),
        )
        .for('share');
      // Arquivo atrasado não pode recuperar estoque ou preço que já foi atualizado.
      if (!current || !isDeepStrictEqual(current.product, row.product)) {
        skipped++;
        continue;
      }
      if (row.publication && connection)
        await tx
          .insert(supplierPublicationMappings)
          .values({
            userId: targetUserId,
            shopId: connection.shopId,
            applicationId: connection.applicationId,
            supplierId: row.product.supplierId,
            sku: row.product.sku,
            payload: row.publication,
            confirmedBy: session.user.id,
          })
          .onConflictDoUpdate({
            target: [
              supplierPublicationMappings.userId,
              supplierPublicationMappings.supplierId,
              supplierPublicationMappings.sku,
              supplierPublicationMappings.shopId,
              supplierPublicationMappings.applicationId,
            ],
            set: {
              payload: row.publication,
              confirmedBy: session.user.id,
              confirmedAt: new Date(),
            },
          });
    }
    return skipped;
  });
  revalidatePath('/admin/assistente');
  revalidatePath('/loja-pronta/produtos');
  redirect(`/admin/assistente?resultado=${ignored ? 'outdated' : 'saved'}`);
}

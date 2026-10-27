'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '@/server/db';
import { storeAutomationJobs, storeBrand } from '@/server/db/schema';
import { brandPublicationEnabled } from '@/features/brand/server/publication-settings';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { queueApprovedBrand } from '@/features/brand/server/publication';
import { requireProductAction } from '@/features/products/server/access';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { uploadShopeeImage } from '@/features/shopee/server/resources';
import { assertAssistantAccess } from './metrics';
import { listingChangeOptions } from './change-options';
import { queueStoreChange, reconcileStoreChange, finishClonedVariations } from './store-changes';
import { readCloneOffer, newCloneTemplate } from './listing-clones';

export async function sendStoreBrand(): Promise<void> {
  return runAsStudent('sendStoreBrand', async () => {
    const { userId } = await requireProductAction('loja-pronta');
    let saved = false;
    try {
      await queueApprovedBrand(userId);
      saved = true;
    } catch {
      /* Only a confirmed current brand may be queued. */
    }
    revalidatePath('/loja-pronta/produtos');
    redirect(`/loja-pronta/produtos?resultado=${saved ? 'brand-queued' : 'brand-unavailable'}`);
  });
}

export async function submitListingChanges(form: FormData): Promise<void> {
  return runAsStudent('submitListingChanges', async () => {
    const { userId } = await requireProductAction('sll');
    const selected = z
      .array(z.coerce.number().int().positive().safe())
      .min(1)
      .max(50)
      .safeParse(form.getAll('itemId'));
    if (
      !selected.success ||
      new Set(selected.data).size !== selected.data.length ||
      form.get('confirmed') !== 'true'
    )
      redirect('/sll/anuncios?resultado=invalid');
    let saved = false;
    try {
      const config = await assertAssistantAccess(userId, 'sll');
      if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true')
        throw new Error('Alterações indisponíveis.');
      const access = await readShopeeAccess(userId, config);
      const cloneMode = form.get('mode') === 'clone';
      const offers = new Map<number, Awaited<ReturnType<typeof readCloneOffer>>>();
      const intentId = cloneMode ? z.uuid().parse(form.get('cloneIntent')) : '';
      if (cloneMode) {
        if (process.env.SHOPEE_DUPLICATION_ENABLED !== 'true')
          throw new Error('Experimentos indisponíveis.');
        const expected = new Map(
          form
            .getAll('cloneOffer')
            .map((value) =>
              z
                .tuple([z.number(), z.string().regex(/^[a-f0-9]{64}$/)])
                .parse(JSON.parse(String(value))),
            ),
        );
        for (const itemId of selected.data) {
          const offer = await readCloneOffer(config, access, userId, itemId);
          if (expected.get(itemId) !== offer.fingerprint)
            throw new Error('A oferta mudou. Confira os valores novamente.');
          offers.set(itemId, offer);
        }
      }
      const title = z
        .string()
        .trim()
        .max(120)
        .parse(String(form.get('title') ?? ''));
      const description = z
        .string()
        .trim()
        .max(3000)
        .parse(String(form.get('description') ?? ''));
      const category = String(form.get('categoryId') ?? '');
      const categoryId = category
        ? z.coerce.number().int().positive().safe().parse(category)
        : undefined;
      const attributes = categoryId
        ? (await listingChangeOptions(userId, categoryId)).attributes.flatMap((attribute) => {
            const value = String(form.get(`attribute-${attribute.attribute_id}`) ?? '').trim();
            if (!value) {
              if (attribute.is_mandatory) throw new Error('Atributo obrigatório.');
              return [];
            }
            const allowed = attribute.attribute_value_list.find(
              (row) => String(row.value_id) === value,
            );
            if (attribute.attribute_value_list.length && !allowed)
              throw new Error('Atributo inválido.');
            return [
              {
                attribute_id: attribute.attribute_id,
                attribute_value_list: [
                  {
                    value_id: allowed?.value_id ?? 0,
                    original_value_name:
                      allowed?.original_value_name ?? z.string().max(500).parse(value),
                  },
                ],
              },
            ];
          })
        : [];
      const file = form.get('image');
      let imageId: string | undefined;
      if (file instanceof File && file.size) {
        if (file.size > 5_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
          throw new Error('Imagem inválida.');
        const bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 40_000_000,
        })
          .rotate()
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 88 })
          .toBuffer();
        imageId = await uploadShopeeImage(config, access, bytes);
      }
      if (cloneMode && (!title || !categoryId || !imageId))
        throw new Error('O experimento exige novo título, categoria e imagem.');
      const requests = selected.data.map((itemId) => {
        const changes = {
          ...(title ? { item_name: title } : {}),
          ...(description ? { description } : {}),
          ...(categoryId ? { category_id: categoryId, attribute_list: attributes } : {}),
          ...(imageId ? { image: { image_id_list: [imageId] } } : {}),
        };
        const offer = offers.get(itemId);
        if (cloneMode && offer?.payload.category_id === categoryId)
          throw new Error('Escolha outra categoria para o experimento.');
        return {
          itemId,
          payload: cloneMode
            ? {
                item_id: itemId,
                sourceFingerprint: offer!.fingerprint,
                template: newCloneTemplate(offer!, changes, intentId),
              }
            : { item_id: itemId, ...changes },
        };
      });
      for (const request of requests)
        await queueStoreChange(userId, cloneMode ? 'clone' : 'edit', request.payload);
      saved = true;
    } catch {
      /* Mensagem de falha controlada. */
    }
    revalidatePath('/sll/anuncios');
    redirect(`/sll/anuncios?resultado=${saved ? 'queued' : 'unavailable'}`);
  });
}

export async function checkStoreChange(form: FormData): Promise<void> {
  return runAsStudent('checkStoreChange', async () => {
    const { userId } = await requireProductAction('sll');
    const parsed = z.uuid().safeParse(form.get('jobId'));
    if (parsed.success)
      try {
        await reconcileStoreChange(userId, parsed.data);
      } catch {
        /* Mantém o resultado incerto. */
      }
    revalidatePath('/sll/anuncios');
  });
}

export async function checkBrandChange(form: FormData): Promise<void> {
  return runAsStudent('checkBrandChange', async () => {
    const { userId } = await requireProductAction('loja-pronta');
    const parsed = z.uuid().safeParse(form.get('jobId'));
    if (parsed.success)
      try {
        await reconcileStoreChange(userId, parsed.data);
      } catch {
        /* Mantém o resultado incerto. */
      }
    revalidatePath('/loja-pronta/produtos');
  });
}

export async function retryStoreChange(form: FormData): Promise<void> {
  return runAsStudent('retryStoreChange', async () => {
    const { userId } = await requireProductAction('sll');
    const parsed = z.uuid().safeParse(form.get('jobId'));
    if (!parsed.success) return;
    await db
      .update(storeAutomationJobs)
      .set({ status: 'pending', failure: null, leaseUntil: null })
      .where(
        and(
          eq(storeAutomationJobs.id, parsed.data),
          eq(storeAutomationJobs.userId, userId),
          sql`${storeAutomationJobs.kind} in ('edit','clone')`,
          eq(storeAutomationJobs.status, 'blocked'),
        ),
      );
    revalidatePath('/sll/anuncios');
  });
}

export async function finishStoreExperiment(form: FormData): Promise<void> {
  return runAsStudent('finishStoreExperiment', async () => {
    const { userId } = await requireProductAction('sll');
    const parsed = z.uuid().safeParse(form.get('jobId'));
    if (parsed.success)
      try {
        await finishClonedVariations(userId, parsed.data);
      } catch {
        /* Mantém o resultado pendente para conferência. */
      }
    revalidatePath('/sll/anuncios');
  });
}

export async function retryBrandPublication(form: FormData): Promise<void> {
  return runAsStudent('retryBrandPublication', async () => {
    const { userId } = await requireProductAction('loja-pronta');
    const parsed = z.uuid().safeParse(form.get('jobId'));
    if (!parsed.success || !brandPublicationEnabled()) return;
    const config = await assertAssistantAccess(userId, 'loja-pronta');
    const access = await readShopeeAccess(userId, config);
    await db.transaction(async (tx) => {
      const [brand] = await tx
        .select()
        .from(storeBrand)
        .where(eq(storeBrand.userId, userId))
        .for('share');
      if (
        !brand?.publicationFingerprint ||
        brand.publicationFingerprint !== brandFingerprint(brand)
      )
        return;
      await tx
        .update(storeAutomationJobs)
        .set({ status: 'pending', failure: null, leaseUntil: null })
        .where(
          and(
            eq(storeAutomationJobs.id, parsed.data),
            eq(storeAutomationJobs.userId, userId),
            eq(storeAutomationJobs.kind, 'brand'),
            eq(storeAutomationJobs.status, 'blocked'),
            eq(storeAutomationJobs.sourceFingerprint, brand.publicationFingerprint),
            eq(storeAutomationJobs.shopId, String(access.shopId)),
            eq(
              storeAutomationJobs.applicationId,
              `${config.SHOPEE_ENVIRONMENT}:${config.SHOPEE_PARTNER_ID}`,
            ),
          ),
        );
    });
    revalidatePath('/loja-pronta/produtos');
  });
}

/** Existing completed journeys may authorize publication without reopening locked editing steps. */
export async function confirmSavedBrand(form: FormData): Promise<void> {
  return runAsStudent('confirmSavedBrand', async () => {
    const { userId } = await requireProductAction('loja-pronta');
    const [brand] = await db.select().from(storeBrand).where(eq(storeBrand.userId, userId));
    const path = '/loja-pronta/marca/publication';
    if (
      !brand?.completedAt ||
      !brand.name ||
      !brand.logoImage ||
      !brand.description ||
      form.get('confirmed') !== 'true' ||
      form.get('fingerprint') !== brandFingerprint(brand)
    )
      redirect(`${path}?resultado=changed`);
    const [approved] = await db
      .update(storeBrand)
      .set({ publicationFingerprint: brandFingerprint(brand) })
      .where(
        and(
          eq(storeBrand.userId, userId),
          eq(storeBrand.name, brand.name),
          eq(storeBrand.logoImage, brand.logoImage),
          eq(storeBrand.description, brand.description),
        ),
      )
      .returning({ userId: storeBrand.userId });
    if (!approved) redirect(`${path}?resultado=changed`);
    revalidatePath('/loja-pronta/produtos');
    redirect('/loja-pronta/produtos?resultado=brand-approved');
  });
}

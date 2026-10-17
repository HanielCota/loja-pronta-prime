'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '@/server/db';
import { storeBrand, storeAutomationJobs } from '@/server/db/schema';
import { storage } from '@/server/storage';
import { requireProductAction } from '@/features/products/server/access';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { uploadShopeeImage, uploadShopeeMedia } from '@/features/shopee/server/resources';
import { assertAssistantAccess } from './metrics';
import { listingChangeOptions } from './change-options';
import { queueStoreChange, reconcileStoreChange, finishClonedVariations } from './store-changes';
import { readCloneOffer, newCloneTemplate } from './listing-clones';

export async function sendStoreBrand(): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  let saved = false;
  try {
    const [brand] = await db.select().from(storeBrand).where(eq(storeBrand.userId, userId));
    if (!brand?.completedAt || !brand.name || !brand.description || !brand.logoImage)
      throw new Error('Marca incompleta.');
    const config = await assertAssistantAccess(userId, 'loja-pronta');
    if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true')
      throw new Error('Alterações indisponíveis.');
    const access = await readShopeeAccess(userId, config);
    const logo = await storage().get(brand.logoImage);
    if (!logo) throw new Error('Imagem indisponível.');
    const bytes = await sharp(logo, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(512, 512, { fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 90 })
      .toBuffer();
    const uploaded = await uploadShopeeMedia(config, access, bytes);
    if (!uploaded.url) throw new Error('Endereço da imagem indisponível.');
    await queueStoreChange(userId, 'brand', {
      shop_name: brand.name,
      description: brand.description,
      shop_logo: uploaded.url,
    });
    saved = true;
  } catch {
    /* A tela não recebe credenciais nem respostas externas. */
  }
  revalidatePath('/loja-pronta/produtos');
  redirect(`/loja-pronta/produtos?resultado=${saved ? 'queued' : 'unavailable'}`);
}

export async function submitListingChanges(form: FormData): Promise<void> {
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
}

export async function checkStoreChange(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('sll');
  const parsed = z.uuid().safeParse(form.get('jobId'));
  if (parsed.success)
    try {
      await reconcileStoreChange(userId, parsed.data);
    } catch {
      /* Mantém o resultado incerto. */
    }
  revalidatePath('/sll/anuncios');
}

export async function checkBrandChange(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const parsed = z.uuid().safeParse(form.get('jobId'));
  if (parsed.success)
    try {
      await reconcileStoreChange(userId, parsed.data);
    } catch {
      /* Mantém o resultado incerto. */
    }
  revalidatePath('/loja-pronta/produtos');
}

export async function retryStoreChange(form: FormData): Promise<void> {
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
}

export async function finishStoreExperiment(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('sll');
  const parsed = z.uuid().safeParse(form.get('jobId'));
  if (parsed.success)
    try {
      await finishClonedVariations(userId, parsed.data);
    } catch {
      /* Mantém o resultado pendente para conferência. */
    }
  revalidatePath('/sll/anuncios');
}

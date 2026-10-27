'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireProductAction } from '@/features/products/server/access';
import { assertAssistantAccess } from '@/features/assistant/server/metrics';
import { shopeeApplicationId } from '@/features/shopee/authorization';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { importedProduct } from './catalog-data';
import { recoveredPublicationOptions, recoveredCategoryOptions } from './publication-options';
import {
  recoveredPublication,
  saveRecoveredPublicationOptions,
  reviewRecoveredPublication,
  confirmRecoveredPublication,
} from './publication-data';
import { recoveredPublicationEnabled } from './publication-runtime';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { publicationLocked, recoveredConfirmationSchema } from '../publication';

const root = '/loja-pronta/produtos/recovered';
const pathFor = (id: string) => `${root}/${id}/publish`;
const productId = (form: FormData) => z.guid().parse(form.get('productId'));
async function currentAccess(userId: string) {
  if (!recoveredPublicationEnabled()) throw new Error('disabled');
  const config = await assertAssistantAccess(userId, 'loja-pronta');
  if (config.SHOPEE_ENVIRONMENT !== 'live') throw new Error('sandbox');
  return { config, access: await readShopeeAccess(userId, config) };
}

export async function startRecoveredPublication(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const parsed = z.guid().safeParse(form.get('productId'));
  if (!parsed.success) redirect(root);
  const id = parsed.data;
  let result = 'unavailable';
  try {
    const imported = await importedProduct(db.$client, userId, id);
    if (!imported) throw new Error('scope');
    const existing = await recoveredPublication(db.$client, userId, id);
    if (existing && publicationLocked(existing.status)) result = 'ready';
    else {
      if (!(await consumeAttempt('shopeePerUser', userId))) throw new Error('limited');
      const { config, access } = await currentAccess(userId);
      let context = await recoveredPublicationOptions(config, access);
      const categoryId = Number(form.get('categoryId') || imported.product.categoryId);
      if (context.categories.some((row) => row.id === categoryId))
        context = await recoveredCategoryOptions(config, access, context, categoryId);
      await saveRecoveredPublicationOptions(
        db.$client,
        userId,
        id,
        shopeeApplicationId(config),
        access.shopId,
        context,
      );
      result = 'ready';
    }
  } catch {
    /* Marketplace details and credentials never enter redirects. */
  }
  revalidatePath(pathFor(id));
  redirect(`${pathFor(id)}?resultado=${result}`);
}

export async function reviewRecoveredPublicationAction(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const id = productId(form);
  let saved = false;
  try {
    const { config, access } = await currentAccess(userId);
    const row = await recoveredPublication(db.$client, userId, id);
    if (!row || row.application_id !== shopeeApplicationId(config) || row.shop_id !== access.shopId)
      throw new Error('destination');
    saved = await reviewRecoveredPublication(
      db.$client,
      userId,
      id,
      z.coerce.number().int().positive().parse(form.get('revision')),
      z.guid().parse(form.get('publicationId')),
      form,
    );
  } catch {
    /* The form explains the required current data without echoing external errors. */
  }
  revalidatePath(pathFor(id));
  redirect(`${pathFor(id)}?resultado=${saved ? 'reviewed' : 'invalid'}`);
}

export async function confirmRecoveredPublicationAction(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const id = productId(form);
  let saved = false;
  try {
    const confirmation = recoveredConfirmationSchema.parse(Object.fromEntries(form));
    const { config, access } = await currentAccess(userId);
    saved = await confirmRecoveredPublication(
      db.$client,
      userId,
      id,
      confirmation.fingerprint,
      shopeeApplicationId(config),
      access.shopId,
    );
  } catch {
    /* Confirmation failures cannot authorize a later automatic retry. */
  }
  revalidatePath(pathFor(id));
  redirect(`${pathFor(id)}?resultado=${saved ? 'confirmed' : 'expired'}`);
}

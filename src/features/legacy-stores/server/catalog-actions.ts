'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireProductAction } from '@/features/products/server/access';
import { recoveredSelectionSchema, catalogReviewSchema } from '../catalog-import';
import { importRecoveredProducts, reviewImportedProduct } from './catalog-data';

const path = '/loja-pronta/produtos/recovered';
export async function importRecoveredCatalog(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const parsed = recoveredSelectionSchema.safeParse({
    storeId: form.get('storeId'),
    productIds: form.getAll('productId'),
  });
  if (!parsed.success) redirect(`${path}?resultado=invalid`);
  let count = 0;
  try {
    count = await importRecoveredProducts(db.$client, userId, parsed.data);
  } catch {
    redirect(`${path}?resultado=unavailable`);
  }
  revalidatePath(path);
  revalidatePath('/loja-pronta');
  redirect(`${path}?store=${parsed.data.storeId}&resultado=imported&quantidade=${count}`);
}

export async function saveRecoveredCatalogReview(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const parsed = catalogReviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${path}?resultado=invalid`);
  let saved = false;
  try {
    saved = await reviewImportedProduct(db.$client, userId, Object.fromEntries(form));
  } catch {
    /* External errors never enter the response. */
  }
  revalidatePath(path);
  redirect(`${path}/${parsed.data.productId}?resultado=${saved ? 'saved' : 'conflict'}`);
}

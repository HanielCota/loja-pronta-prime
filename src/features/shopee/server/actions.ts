'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { SHOPEE_CONNECT_PATH } from '@/config/shopee';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import { stores } from '@/server/db/schema';

/** A fase da conta na Shopee (ver src/config/store-phases.ts). */
const ACCOUNT_PHASE = 3;

/**
 * "A Shopee liberou a minha conta": a loja passa pra conexão (fase 4). Só quem está na fase da
 * conta avança (outra aba, ou a action chamada direto, não pula nem volta fase).
 */
export async function confirmShopeeAccount(): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  if ((await getStorePhase(userId)) !== ACCOUNT_PHASE) redirect('/loja-pronta');
  await db
    .update(stores)
    .set({ phase: ACCOUNT_PHASE + 1 })
    .where(and(eq(stores.userId, userId), eq(stores.phase, ACCOUNT_PHASE)));
  redirect(SHOPEE_CONNECT_PATH);
}

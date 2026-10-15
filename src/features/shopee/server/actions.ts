'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { env } from '@/config/env';
import { SHOPEE_CONNECT_PATH } from '@/config/shopee';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import { stores } from '@/server/db/schema';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { getShopeeConfiguration } from './client';
import { canUseShopee, parseManualShopeeCallback } from '../authorization';
import {
  beginShopeeAuthorization,
  finishShopeeAuthorization,
  removeShopeeConnection,
} from './connection';

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

export async function connectShopee(): Promise<void> {
  const { userId, session } = await requireProductAction('loja-pronta');
  if ((await getStorePhase(userId)) < 4) redirect('/loja-pronta');
  const config = getShopeeConfiguration();
  if (
    !config ||
    !canUseShopee(config, userId, session.user.role) ||
    config.SHOPEE_CALLBACK_MODE !== 'automatic'
  )
    redirect(`${SHOPEE_CONNECT_PATH}?resultado=unavailable`);
  if (!(await consumeAttempt('shopeePerUser', userId)))
    redirect(`${SHOPEE_CONNECT_PATH}?resultado=limited`);
  const url = await beginShopeeAuthorization(
    userId,
    session.session.id,
    config,
    env.BETTER_AUTH_URL,
  );
  redirect(url);
}

export type ManualShopeeStartResult = { authorizationUrl?: string; error?: string } | undefined;
export type ManualShopeeResult = { error: string } | undefined;

export async function startManualShopeeAuthorization(
  _state: ManualShopeeStartResult,
): Promise<ManualShopeeStartResult> {
  const { userId, session } = await requireProductAction('loja-pronta');
  if ((await getStorePhase(userId)) < 4) redirect('/loja-pronta');
  const config = getShopeeConfiguration();
  if (
    !config ||
    !canUseShopee(config, userId, session.user.role) ||
    config.SHOPEE_CALLBACK_MODE !== 'manual'
  )
    redirect(`${SHOPEE_CONNECT_PATH}?resultado=unavailable`);
  if (!(await consumeAttempt('shopeePerUser', userId)))
    return { error: 'Aguarde um minuto antes de tentar novamente.' };
  try {
    return {
      authorizationUrl: await beginShopeeAuthorization(
        userId,
        session.session.id,
        config,
        env.BETTER_AUTH_URL,
      ),
    };
  } catch {
    return { error: 'Não foi possível preparar a conexão. Tente de novo.' };
  }
}

export async function completeManualShopeeAuthorization(
  _state: ManualShopeeResult,
  formData: FormData,
): Promise<ManualShopeeResult> {
  const { userId, session } = await requireProductAction('loja-pronta');
  if ((await getStorePhase(userId)) < 4) redirect('/loja-pronta');
  const config = getShopeeConfiguration();
  if (
    !config ||
    !canUseShopee(config, userId, session.user.role) ||
    config.SHOPEE_CALLBACK_MODE !== 'manual'
  )
    redirect(`${SHOPEE_CONNECT_PATH}?resultado=unavailable`);
  if (!(await consumeAttempt('shopeeManualReturnPerUser', userId)))
    return { error: 'Aguarde um minuto antes de tentar novamente.' };
  const callback = parseManualShopeeCallback(String(formData.get('returnUrl') ?? ''), config);
  if (!callback)
    return { error: 'Copie o endereço completo que apareceu depois de autorizar na Shopee.' };
  let result = 'failed';
  try {
    result = await finishShopeeAuthorization(
      { ...callback, userId, sessionId: session.session.id },
      config,
    );
  } catch {
    // Nunca ecoar o endereço colado: ele contém um código de uso único.
  }
  redirect(`${SHOPEE_CONNECT_PATH}?resultado=${result}`);
}

export async function disconnectShopee(): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  await removeShopeeConnection(userId);
  redirect(`${SHOPEE_CONNECT_PATH}?resultado=disconnected`);
}

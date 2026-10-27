'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { env } from '@/config/env';
import { SHOPEE_CONNECT_PATH } from '@/config/shopee';
import { shopeeEntry, shopeeConnectionPath, shopeeEntryProduct } from '../entry';
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
  readShopeeAccess,
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

export async function connectShopee(formData: FormData): Promise<void> {
  const origin = shopeeEntry(formData.get('origin'));
  const { userId, session } = await requireProductAction(shopeeEntryProduct(origin));
  if (origin === 'loja-pronta' && (await getStorePhase(userId)) < 4) redirect('/loja-pronta');
  const config = getShopeeConfiguration();
  if (
    !config ||
    !canUseShopee(config, userId, session.user.role) ||
    config.SHOPEE_CALLBACK_MODE !== 'automatic'
  )
    redirect(`${shopeeConnectionPath(origin)}?resultado=unavailable`);
  if (!(await consumeAttempt('shopeePerUser', userId)))
    redirect(`${shopeeConnectionPath(origin)}?resultado=limited`);
  const url = await beginShopeeAuthorization(
    userId,
    session.session.id,
    config,
    env.BETTER_AUTH_URL,
    origin,
  );
  redirect(url);
}

export type ManualShopeeStartResult = { authorizationUrl?: string; error?: string } | undefined;
export type ManualShopeeResult = { error: string } | undefined;

export async function startManualShopeeAuthorization(
  _state: ManualShopeeStartResult,
  formData: FormData,
): Promise<ManualShopeeStartResult> {
  const origin = shopeeEntry(formData.get('origin'));
  const { userId, session } = await requireProductAction(shopeeEntryProduct(origin));
  if (origin === 'loja-pronta' && (await getStorePhase(userId)) < 4) redirect('/loja-pronta');
  const config = getShopeeConfiguration();
  if (
    !config ||
    !canUseShopee(config, userId, session.user.role) ||
    config.SHOPEE_CALLBACK_MODE !== 'manual'
  )
    redirect(`${shopeeConnectionPath(origin)}?resultado=unavailable`);
  if (!(await consumeAttempt('shopeePerUser', userId)))
    return { error: 'Aguarde um minuto antes de tentar novamente.' };
  try {
    return {
      authorizationUrl: await beginShopeeAuthorization(
        userId,
        session.session.id,
        config,
        env.BETTER_AUTH_URL,
        origin,
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
  const origin = shopeeEntry(formData.get('origin'));
  const { userId, session } = await requireProductAction(shopeeEntryProduct(origin));
  if (origin === 'loja-pronta' && (await getStorePhase(userId)) < 4) redirect('/loja-pronta');
  const config = getShopeeConfiguration();
  if (
    !config ||
    !canUseShopee(config, userId, session.user.role) ||
    config.SHOPEE_CALLBACK_MODE !== 'manual'
  )
    redirect(`${shopeeConnectionPath(origin)}?resultado=unavailable`);
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
  redirect(`${shopeeConnectionPath(origin)}?resultado=${result}`);
}

export async function disconnectShopee(formData: FormData): Promise<void> {
  const origin = shopeeEntry(formData.get('origin'));
  const { userId } = await requireProductAction(shopeeEntryProduct(origin));
  await removeShopeeConnection(userId);
  redirect(`${shopeeConnectionPath(origin)}?resultado=disconnected`);
}

/** Uma conexão feita pelo SLL pode ser reutilizada, após conferir a loja e o acesso atual. */
export async function continueWithConnectedShopee(): Promise<void> {
  const { userId, session } = await requireProductAction('loja-pronta');
  const config = getShopeeConfiguration();
  if (
    !config ||
    !canUseShopee(config, userId, session.user.role) ||
    config.SHOPEE_ENVIRONMENT !== 'live'
  )
    redirect(`${SHOPEE_CONNECT_PATH}?resultado=unavailable`);
  try {
    await readShopeeAccess(userId, config);
  } catch {
    redirect(`${SHOPEE_CONNECT_PATH}?resultado=failed`);
  }
  await db
    .update(stores)
    .set({ phase: 5 })
    .where(and(eq(stores.userId, userId), eq(stores.phase, 4)));
  redirect('/loja-pronta/produtos');
}

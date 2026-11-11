import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import {
  shopeeConnectionPath,
  shopeeEntryProduct,
  type ShopeeEntry,
} from '@/features/shopee/entry';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts } from '@/features/products/server/access';
import { canUseShopee, parseShopeeCallback } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { visitForRoute } from '@/features/staff/server/impersonation';
import { VISIT_BLOCKED_PATH } from '@/features/staff/visit-rules';
import { VISIT_OVER_PATH } from '@/features/staff/visit-window';
import {
  finishShopeeAuthorization,
  getShopeeAuthorizationOrigin,
} from '@/features/shopee/server/connection';

type CallbackOutcome = { result: string; origin: ShopeeEntry };

// Resultado à parte pra cada saída retornar cedo; sem conexão concluída, volta o que já se sabia.
async function authorizationResult(
  session: Awaited<ReturnType<typeof getActiveSession>>,
  config: ReturnType<typeof getShopeeConfiguration>,
  callback: ReturnType<typeof parseShopeeCallback>,
): Promise<CallbackOutcome> {
  const result = config?.SHOPEE_ENABLED === 'true' ? 'expired' : 'unavailable';
  if (!session || needsFirstPassword(session.user)) return { result, origin: 'loja-pronta' };
  const userId = session.user.id;
  const sessionId = session.session.id;
  const [{ products }, savedOrigin] = await Promise.all([
    getStudentProducts(userId),
    callback ? getShopeeAuthorizationOrigin(userId, sessionId, callback.state) : null,
  ]);
  const origin =
    savedOrigin ??
    (products.includes('sll') && !products.includes('loja-pronta') ? 'sll' : 'loja-pronta');
  if (
    !config ||
    !callback ||
    !savedOrigin ||
    !canUseShopee(config, userId, session.user.role) ||
    !products.includes(shopeeEntryProduct(savedOrigin))
  )
    return { result, origin };
  try {
    return {
      result: await finishShopeeAuthorization({ ...callback, userId, sessionId }, config),
      origin,
    };
  } catch {
    return { result: 'failed', origin };
  }
}

export async function GET(request: Request) {
  // Durante "Entrar como aluna", a Shopee dela não é conectada (o vínculo dura além da visita).
  const visit = await visitForRoute('shopeeCallback');
  if (visit.status === 'over')
    return NextResponse.redirect(new URL(VISIT_OVER_PATH, request.url), 303);
  if (visit.status === 'refused')
    return NextResponse.redirect(
      new URL(`${VISIT_BLOCKED_PATH}?acao=shopeeCallback`, request.url),
      303,
    );
  const session = await getActiveSession();
  const config = getShopeeConfiguration();
  const callback = parseShopeeCallback(new URL(request.url).searchParams);
  const outcome = await authorizationResult(session, config, callback);
  // Nenhum código, estado, mensagem externa ou Host recebido é reaproveitado no destino.
  const response = NextResponse.redirect(
    new URL(
      `${shopeeConnectionPath(outcome.origin)}?resultado=${outcome.result}`,
      env.BETTER_AUTH_URL,
    ),
    303,
  );
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

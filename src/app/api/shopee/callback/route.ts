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
import { visitForRoute } from '@/features/support/server/impersonation';
import { VISIT_BLOCKED_PATH } from '@/features/support/visit-rules';
import { VISIT_OVER_PATH } from '@/features/support/visit-window';
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
  current: CallbackOutcome,
): Promise<CallbackOutcome> {
  if (!config || config.SHOPEE_ENABLED !== 'true') return { ...current, result: 'unavailable' };
  if (
    !session ||
    needsFirstPassword(session.user) ||
    !callback ||
    !canUseShopee(config, session.user.id, session.user.role)
  )
    return current;
  const { products } = await getStudentProducts(session.user.id);
  const savedOrigin = await getShopeeAuthorizationOrigin(
    session.user.id,
    session.session.id,
    callback.state,
  );
  if (!savedOrigin) return current;
  if (!products.includes(shopeeEntryProduct(savedOrigin)))
    return { ...current, origin: savedOrigin };
  try {
    const result = await finishShopeeAuthorization(
      { ...callback, userId: session.user.id, sessionId: session.session.id },
      config,
    );
    return { result, origin: savedOrigin };
  } catch {
    return { result: 'failed', origin: savedOrigin };
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
  let origin: ShopeeEntry = 'loja-pronta';
  const session = await getActiveSession();
  const config = getShopeeConfiguration();
  const callback = parseShopeeCallback(new URL(request.url).searchParams);
  if (session && callback && !needsFirstPassword(session.user))
    origin =
      (await getShopeeAuthorizationOrigin(session.user.id, session.session.id, callback.state)) ??
      origin;
  const outcome = await authorizationResult(session, config, callback, {
    result: 'expired',
    origin,
  });
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

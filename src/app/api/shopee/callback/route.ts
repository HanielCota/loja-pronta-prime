import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { shopeeConnectionPath, type ShopeeEntry } from '@/features/shopee/entry';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts } from '@/features/products/server/access';
import { canUseShopee, parseShopeeCallback } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import {
  finishShopeeAuthorization,
  getShopeeAuthorizationOrigin,
} from '@/features/shopee/server/connection';

export async function GET(request: Request) {
  let result = 'expired';
  let origin: ShopeeEntry = 'loja-pronta';
  const session = await getActiveSession();
  const config = getShopeeConfiguration();
  const callback = parseShopeeCallback(new URL(request.url).searchParams);
  if (session && callback && !needsFirstPassword(session.user))
    origin =
      (await getShopeeAuthorizationOrigin(session.user.id, session.session.id, callback.state)) ??
      origin;
  if (!config || config.SHOPEE_ENABLED !== 'true') result = 'unavailable';
  else if (
    session &&
    !needsFirstPassword(session.user) &&
    callback &&
    canUseShopee(config, session.user.id, session.user.role)
  ) {
    const { products } = await getStudentProducts(session.user.id);
    const savedOrigin = await getShopeeAuthorizationOrigin(
      session.user.id,
      session.session.id,
      callback.state,
    );
    if (savedOrigin) origin = savedOrigin;
    if (savedOrigin && products.includes(savedOrigin)) {
      try {
        result = await finishShopeeAuthorization(
          { ...callback, userId: session.user.id, sessionId: session.session.id },
          config,
        );
      } catch {
        result = 'failed';
      }
    }
  }
  // Nenhum código, estado, mensagem externa ou Host recebido é reaproveitado no destino.
  const response = NextResponse.redirect(
    new URL(`${shopeeConnectionPath(origin)}?resultado=${result}`, env.BETTER_AUTH_URL),
    303,
  );
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

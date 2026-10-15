import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { SHOPEE_CONNECT_PATH } from '@/config/shopee';
import { hasAdminRole } from '@/features/admin/access';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts } from '@/features/products/server/access';
import { parseShopeeCallback } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { finishShopeeAuthorization } from '@/features/shopee/server/connection';

export async function GET(request: Request) {
  let result = 'expired';
  const session = await getActiveSession();
  const config = getShopeeConfiguration();
  const callback = parseShopeeCallback(new URL(request.url).searchParams);
  if (!config || config.SHOPEE_ENABLED !== 'true') result = 'unavailable';
  else if (
    session &&
    !needsFirstPassword(session.user) &&
    callback &&
    (config.SHOPEE_ENVIRONMENT === 'live' || hasAdminRole(session.user.role))
  ) {
    const { products } = await getStudentProducts(session.user.id);
    if (products.includes('loja-pronta')) {
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
    new URL(`${SHOPEE_CONNECT_PATH}?resultado=${result}`, env.BETTER_AUTH_URL),
    303,
  );
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

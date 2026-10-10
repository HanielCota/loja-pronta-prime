import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { requireAdmin } from '@/features/admin/server/access';
import { BLING_PATH, parseBlingCallback } from '@/features/bling/model';
import { getBlingConfiguration } from '@/features/bling/server/client';
import { finishBlingAuthorization } from '@/features/bling/server/connection';

export async function GET(request: Request) {
  const session = await requireAdmin(BLING_PATH);
  const config = getBlingConfiguration();
  const callback = parseBlingCallback(new URL(request.url).searchParams);
  let result = 'expired';
  if (!config) result = 'unavailable';
  else if (callback) {
    try {
      result = await finishBlingAuthorization(
        { userId: session.user.id, sessionId: session.session.id, ...callback },
        config,
      );
    } catch {
      result = 'failed';
    }
  }
  // O código sai imediatamente da barra do navegador, sem usar Host ou destino enviados pelo cliente.
  const response = NextResponse.redirect(
    new URL(`${BLING_PATH}?resultado=${result}`, env.BETTER_AUTH_URL),
    303,
  );
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { requireAdmin } from '@/features/admin/server/access';
import { BLING_PATH, parseBlingCallback } from '@/features/bling/model';
import { getBlingConfiguration, reportBlingFailure } from '@/features/bling/server/client';
import { finishBlingAuthorization } from '@/features/bling/server/connection';

// Resultado à parte pra cada saída retornar cedo; o redirecionamento abaixo é o mesmo pra todas.
async function authorizationResult(
  account: { userId: string; sessionId: string },
  config: ReturnType<typeof getBlingConfiguration>,
  callback: ReturnType<typeof parseBlingCallback>,
) {
  if (!config) return 'unavailable';
  if (!callback) return 'expired';
  try {
    return await finishBlingAuthorization({ ...account, ...callback }, config);
  } catch (error) {
    reportBlingFailure('callback', error);
    return 'failed';
  }
}

export async function GET(request: Request) {
  const session = await requireAdmin(BLING_PATH);
  const config = getBlingConfiguration();
  const callback = parseBlingCallback(new URL(request.url).searchParams);
  const result = await authorizationResult(
    { userId: session.user.id, sessionId: session.session.id },
    config,
    callback,
  );
  // O código sai imediatamente da barra do navegador, sem usar Host ou destino enviados pelo cliente.
  const response = NextResponse.redirect(
    new URL(`${BLING_PATH}?resultado=${result}`, env.BETTER_AUTH_URL),
    303,
  );
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

import { NextResponse } from 'next/server';
import { getActiveSession } from '@/features/auth/server/session';
import { recordPresence } from '@/features/presence/server/record';
import { visitForRoute } from '@/features/support/server/impersonation';
import { readLimitedBody, RequestBodyTooLargeError } from '@/lib/request-body';
import { hasTrustedOrigin } from '@/server/request/origin';

/** O aviso cabe com folga em 4 KB (o caminho e uns 15 campos curtos do aparelho). */
const MAX_BYTES = 4 * 1024;

const noStore = { 'Cache-Control': 'no-store' };

/**
 * O aviso de presença das áreas (a página aberta e o aparelho). Rota própria, e não Server Action:
 * a Server Action faria POST no endereço da página, misturando a telemetria com os envios de
 * formulário dela (a conversa conta os salvamentos pelos POSTs).
 */
export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return new NextResponse(null, { status: 403, headers: noStore });
  const session = await getActiveSession();
  if (!session) return new NextResponse(null, { status: 401, headers: noStore });
  // A equipe dentro da conta da aluna não faz a aluna aparecer online nem muda o "visto por último".
  if ((await visitForRoute('recordPresence')).status !== 'student')
    return new NextResponse(null, { status: 204, headers: noStore });

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(await readLimitedBody(request, MAX_BYTES)));
  } catch (error) {
    const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
    return new NextResponse(null, { status, headers: noStore });
  }
  const { path, device } = (body ?? {}) as { path?: unknown; device?: unknown };
  const saved = await recordPresence({
    userId: session.user.id,
    path,
    device,
    userAgent: request.headers.get('user-agent'),
  });
  return new NextResponse(null, { status: saved ? 204 : 400, headers: noStore });
}

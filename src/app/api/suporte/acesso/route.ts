import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { openTicket } from '@/features/support/server/new-ticket';
import { isEnhanced, respond, text } from '@/features/support/server/route-helpers';
import { consumeAttempts } from '@/server/auth/rate-limit';
import { db } from '@/server/db';
import { user } from '@/server/db/schema';
import { hasTrustedOrigin } from '@/server/request/origin';
import { getClientIp } from '@/server/request/client-ip';
import { readLimitedFormData } from '@/lib/request-body';

const SAME_ANSWER =
  'Recebemos. Se este for o e-mail da compra, enviamos um link pra você acompanhar o chamado. Olhe também o spam.';

const emailSchema = z.email().max(254);

/**
 * "Não consegue entrar?": abre um chamado sem login. Limite por IP e por e-mail; a resposta é a
 * mesma exista a conta ou não (não revela quem tem conta). O chamado só aparece na conta da aluna
 * depois que o link do e-mail é aberto.
 */
export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return new Response('Origem não permitida.', { status: 403 });
  let form: FormData;
  try {
    form = await readLimitedFormData(request, 64 * 1024);
  } catch {
    return respond(true, { ok: false, message: 'Não foi possível ler o formulário.', status: 400, backTo: '/suporte/acesso' });
  }
  const enhanced = isEnhanced(form);
  const email = text(form, 'email', 254).trim().toLowerCase();
  const name = text(form, 'nome', 80).trim();
  if (!emailSchema.safeParse(email).success || name.length < 2)
    return respond(enhanced, { ok: false, message: 'Confira o seu nome e o e-mail da compra.', status: 400, backTo: '/suporte/acesso' });
  const blocked = await consumeAttempts([
    ['supportPublicPerIp', await getClientIp()],
    ['supportPublicPerEmail', email],
  ]);
  if (blocked)
    return respond(enhanced, { ok: false, message: 'Muitos pedidos em pouco tempo. Tente de novo daqui a uma hora.', status: 429, backTo: '/suporte/acesso' });
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  const situation = text(form, 'situacao', 64);
  const outcome = await openTicket({
    requester: { id: account?.id ?? null, email, name },
    channel: 'public_form',
    draft: { topicId: 'access', situationId: situation || null, description: text(form, 'descricao') },
    context: { product: null, lessonId: null, storePhase: null, errorDigest: null, pagePath: '/entrar' },
    assistantAnswerId: null,
    files: [],
    submissionId: text(form, 'envio', 64) || null,
  });
  if (!outcome.ok)
    return respond(enhanced, { ok: false, message: outcome.message, status: outcome.status, backTo: '/suporte/acesso' });
  if (enhanced) return Response.json({ ok: true, message: SAME_ANSWER }, { headers: { 'Cache-Control': 'no-store' } });
  return respond(false, { ok: true, redirectTo: '/suporte/acesso/recebido' });
}

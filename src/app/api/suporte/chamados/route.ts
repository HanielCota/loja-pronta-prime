import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { MAX_ATTACHMENT_REQUEST_BYTES } from '@/features/support/attachments';
import { filesFromForm } from '@/features/support/server/attachments';
import { refuseDuringVisit, VISIT_WRITE_REFUSED } from '@/features/support/server/impersonation';
import { openTicket, readTicketContext } from '@/features/support/server/new-ticket';
import { isEnhanced, respond, text } from '@/features/support/server/route-helpers';
import { readLimitedFormData, RequestBodyTooLargeError } from '@/lib/request-body';
import { hasTrustedOrigin } from '@/server/request/origin';

/** Abre um chamado da aluna (com anexos). Sem JavaScript, volta pra conversa ou pro formulário. */
export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return new Response('Origem não permitida.', { status: 403 });
  const state = await getSessionState();
  if (state.status !== 'active' || needsFirstPassword(state.session.user))
    return respond(false, { ok: true, redirectTo: '/entrar?next=/suporte/novo' });
  let form: FormData;
  try {
    form = await readLimitedFormData(request, MAX_ATTACHMENT_REQUEST_BYTES);
  } catch (error) {
    const message =
      error instanceof RequestBodyTooLargeError
        ? 'Os arquivos passaram do limite. Envie até 3 arquivos de 5 MB.'
        : 'Não foi possível ler o formulário. Tente de novo.';
    return respond(true, { ok: false, message, status: 400, backTo: '/suporte/novo' });
  }
  const enhanced = isEnhanced(form);
  if (await refuseDuringVisit('abrir chamado', '/suporte/novo'))
    return respond(enhanced, { ok: false, message: VISIT_WRITE_REFUSED, status: 403, backTo: '/suporte/novo' });
  const { user } = state.session;
  const situation = text(form, 'situacao', 64);
  const outcome = await openTicket({
    requester: { id: user.id, email: user.email, name: user.preferredName?.trim() || user.name },
    channel: 'platform',
    draft: {
      topicId: text(form, 'tema', 32),
      situationId: situation || null,
      description: text(form, 'descricao'),
    },
    context: await readTicketContext(form),
    assistantAnswerId: text(form, 'faq', 64) || null,
    files: filesFromForm(form),
    submissionId: text(form, 'envio', 64) || null,
  });
  if (!outcome.ok)
    return respond(enhanced, {
      ok: false,
      message: outcome.message,
      status: outcome.status,
      backTo: '/suporte/novo',
      ...(outcome.field ? { field: outcome.field } : {}),
    });
  return respond(enhanced, { ok: true, redirectTo: `/suporte/${outcome.ticket.number}?enviado=1`, notice: outcome.notice });
}

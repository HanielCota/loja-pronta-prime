import { eq } from 'drizzle-orm';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { MAX_ATTACHMENT_REQUEST_BYTES, refusedFilesNotice } from '@/features/support/attachments';
import { MAX_DESCRIPTION } from '@/features/support/plan-ticket';
import { hasStaffPermission } from '@/features/support/staff-access';
import { TICKET_STATUSES, type TicketStatus } from '@/features/support/ticket-rules';
import {
  attachmentErrorMessage,
  filesFromForm,
  removeStoredAttachments,
  storeAttachments,
  type RefusedAttachment,
} from '@/features/support/server/attachments';
import { refuseDuringVisit, VISIT_WRITE_REFUSED } from '@/features/support/server/impersonation';
import { notifyRequesterReplied, notifyStaffReplied } from '@/features/support/server/notify';
import { isEnhanced, respond, text } from '@/features/support/server/route-helpers';
import {
  appendRequesterMessage,
  appendStaffMessage,
  canSeeQueue,
  ticketFromPublicToken,
  TicketActionError,
  type StoredAttachment,
  type TicketRow,
} from '@/features/support/server/tickets';
import { readLimitedFormData, RequestBodyTooLargeError } from '@/lib/request-body';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { db } from '@/server/db';
import { supportTickets } from '@/server/db/schema';
import { hasTrustedOrigin } from '@/server/request/origin';

type Author =
  | { side: 'requester'; id: string | null; name: string; backTo: string; ticket: TicketRow }
  | { side: 'staff'; id: string; name: string; role: string | null | undefined; backTo: string; ticket: TicketRow };

async function findTicket(number: number) {
  if (!Number.isInteger(number) || number < 1) return null;
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.number, number)).limit(1);
  return ticket ?? null;
}

/** Quem está escrevendo: a dona do chamado, o link mágico ou alguém da equipe com acesso à fila. */
async function resolveAuthor(form: FormData, number: number): Promise<Author | null> {
  const token = text(form, 'token', 120);
  if (token) {
    const ticket = await ticketFromPublicToken(token);
    if (!ticket || ticket.number !== number) return null;
    return { side: 'requester', id: null, name: ticket.requesterName, backTo: `/suporte/acesso/${token}`, ticket };
  }
  const state = await getSessionState();
  if (state.status !== 'active' || needsFirstPassword(state.session.user)) return null;
  const { user } = state.session;
  const ticket = await findTicket(number);
  if (!ticket) return null;
  const name = user.preferredName?.trim() || user.name;
  if (text(form, 'lado', 10) === 'equipe') {
    if (!hasStaffPermission(user.role, 'support.answer') || !canSeeQueue(ticket.queue, user.role)) return null;
    return { side: 'staff', id: user.id, name, role: user.role, backTo: `/admin/chamados/${number}`, ticket };
  }
  // Entrando como aluna, a equipe escreve como ela (fica registrado no log da visita).
  if (ticket.requesterId !== user.id || !ticket.emailConfirmedAt) return null;
  return { side: 'requester', id: user.id, name, backTo: `/suporte/${number}`, ticket };
}

function statusAfter(form: FormData): TicketStatus {
  const value = text(form, 'status_depois', 12);
  return (TICKET_STATUSES as readonly string[]).includes(value) ? (value as TicketStatus) : 'answered';
}

/** Uma mensagem num chamado (aluna, link mágico ou equipe), com até 3 anexos. */
export async function POST(request: Request, { params }: { params: Promise<{ numero: string }> }) {
  if (!hasTrustedOrigin(request)) return new Response('Origem não permitida.', { status: 403 });
  const number = Number((await params).numero);
  let form: FormData;
  try {
    form = await readLimitedFormData(request, MAX_ATTACHMENT_REQUEST_BYTES);
  } catch (error) {
    const message =
      error instanceof RequestBodyTooLargeError
        ? 'Os arquivos passaram do limite. Envie até 3 arquivos de 5 MB.'
        : 'Não foi possível ler a mensagem. Tente de novo.';
    return respond(request, true, { ok: false, message, status: 400, backTo: `/suporte/${number}` });
  }
  const enhanced = isEnhanced(form);
  const author = await resolveAuthor(form, number);
  if (!author)
    return respond(request, enhanced, {
      ok: false,
      message: 'Chamado não encontrado.',
      status: 404,
      backTo: '/suporte',
    });
  if (author.side === 'requester' && (await refuseDuringVisit('mensagem no chamado', author.backTo)))
    return respond(request, enhanced, { ok: false, message: VISIT_WRITE_REFUSED, status: 403, backTo: author.backTo });
  const internal = author.side === 'staff' && form.get('interna') === '1';
  const body = text(form, 'mensagem', MAX_DESCRIPTION + 1).trim();
  const minimum = internal ? 2 : 1;
  if (body.length < minimum || body.length > MAX_DESCRIPTION)
    return respond(request, enhanced, {
      ok: false,
      message: body.length > MAX_DESCRIPTION ? `Escreva até ${MAX_DESCRIPTION} caracteres.` : 'Escreva a mensagem antes de enviar.',
      status: 400,
      backTo: author.backTo,
      field: 'mensagem',
    });
  const files = filesFromForm(form);
  if (files.length && !(await consumeAttempt('supportFilesPerUser', author.id ?? `ticket:${author.ticket.id}`)))
    return respond(request, enhanced, {
      ok: false,
      message: 'Você enviou muitos arquivos em pouco tempo. Espere alguns minutos.',
      status: 429,
      backTo: author.backTo,
    });
  if (author.side === 'staff' && author.ticket.status === 'closed' && !internal)
    return respond(request, enhanced, {
      ok: false,
      message: 'Reabra o chamado antes de responder.',
      status: 409,
      backTo: author.backTo,
    });
  let attachments: StoredAttachment[] = [];
  let refused: RefusedAttachment[] = [];
  try {
    ({ stored: attachments, refused } = await storeAttachments(author.ticket.id, files));
  } catch (error) {
    return respond(request, enhanced, {
      ok: false,
      message: attachmentErrorMessage(error),
      status: 400,
      backTo: author.backTo,
      field: 'anexos',
    });
  }
  try {
    if (author.side === 'staff') {
      const { ticket } = await appendStaffMessage(
        author.ticket.id,
        { id: author.id, name: author.name, role: author.role },
        { body, internal, statusAfter: statusAfter(form) },
        attachments,
      );
      if (!internal) void notifyStaffReplied(ticket).catch(() => console.error('[support] aviso à aluna falhou.'));
    }
    if (author.side === 'requester') {
      const ticket = await appendRequesterMessage(author.ticket.id, { id: author.id, name: author.name }, body, attachments);
      void notifyRequesterReplied(ticket).catch(() => console.error('[support] aviso à responsável falhou.'));
    }
  } catch (error) {
    await removeStoredAttachments(attachments);
    const message =
      error instanceof TicketActionError ? error.message : 'Não foi possível enviar agora. Tente de novo.';
    if (!(error instanceof TicketActionError)) console.error('[support] mensagem não gravada.');
    return respond(request, enhanced, { ok: false, message, status: 409, backTo: author.backTo });
  }
  return respond(request, enhanced, { ok: true, redirectTo: `${author.backTo}#fim`, notice: refusedFilesNotice(refused) });
}

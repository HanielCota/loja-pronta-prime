import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { learningLessons, supportTickets } from '@/server/db/schema';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { planSupportTicket } from '../plan-ticket';
import { refusedFilesNotice } from '../attachments';
import { findTopic, ticketProduct, topicsForProducts } from '../catalog';
import { getStudentProducts } from '@/features/products/server/access';
import { loadSupportCatalog } from './catalog';
import { notifyTicketCreated, sendPublicTicketLink } from './notify';
import {
  attachmentErrorMessage,
  removeStoredAttachments,
  storeAttachments,
  type RefusedAttachment,
} from './attachments';
import {
  TicketActionError,
  createTicket,
  type NewTicketInput,
  type StoredAttachment,
  type TicketRow,
} from './tickets';

/** No máximo 3 chamados abertos ao mesmo tempo (a Ouvidoria fica de fora). */
export const MAX_OPEN_TICKETS = 3;

const uuid = z.uuid();

export type TicketContext = NewTicketInput['context'];

/** O contexto que veio pela URL, conferido: aula que existe, fase de 1 a 7, código de erro curto. */
export async function readTicketContext(form: FormData): Promise<TicketContext> {
  const lesson = String(form.get('aula') ?? '');
  const phase = Number(form.get('fase') ?? '');
  const digest = String(form.get('erro_codigo') ?? '');
  const page = String(form.get('pagina') ?? '');
  let lessonId: string | null = null;
  if (uuid.safeParse(lesson).success) {
    const [found] = await db
      .select({ id: learningLessons.id })
      .from(learningLessons)
      .where(eq(learningLessons.id, lesson))
      .limit(1);
    lessonId = found?.id ?? null;
  }
  const storePhase = Number.isInteger(phase) && phase >= 1 && phase <= 7 ? phase : null;
  return {
    product: lessonId ? 'sll' : storePhase ? 'loja-pronta' : null,
    lessonId,
    storePhase,
    errorDigest: /^[\w-]{1,64}$/.test(digest) ? digest : null,
    pagePath: /^\/[\w\-/]{0,200}$/.test(page) ? page : null,
  };
}

export type CreateOutcome =
  /** `notice`: os anexos que ficaram de fora (o chamado abriu com os outros). */
  | { ok: true; ticket: TicketRow; notice: string | null }
  | { ok: false; message: string; field?: string; status: number };

export type Requester = { id: string | null; email: string; name: string };

/** O chamado que este mesmo envio já abriu (da mesma pessoa: o id sozinho não basta). */
async function findSubmittedTicket(
  submissionId: string,
  requester: Requester,
): Promise<TicketRow | null> {
  const owner = requester.id
    ? eq(supportTickets.requesterId, requester.id)
    : eq(supportTickets.requesterEmail, requester.email);
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.submissionId, submissionId), owner))
    .limit(1);
  return ticket ?? null;
}

function isUniqueViolation(error: unknown): boolean {
  const cause = error instanceof Error && 'cause' in error ? error.cause : error;
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505';
}

/** Abre um chamado: confere o plano, os limites, grava os anexos e avisa a equipe. */
export async function openTicket(input: {
  requester: Requester;
  channel: 'platform' | 'public_form';
  draft: { topicId: string; situationId: string | null; description: string };
  context: TicketContext;
  assistantAnswerId: string | null;
  files: readonly File[];
  /** Id do envio (um por formulário aberto). Repetido: devolve o chamado que já abriu. */
  submissionId: string | null;
}): Promise<CreateOutcome> {
  const submissionId =
    input.submissionId && uuid.safeParse(input.submissionId).success ? input.submissionId : null;
  const repeated = submissionId ? await findSubmittedTicket(submissionId, input.requester) : null;
  if (repeated) return finishSubmission(repeated, input.channel, null);
  const catalog = await loadSupportCatalog();
  const plan = planSupportTicket(catalog, input.draft);
  if (!plan.ok)
    return { ok: false, message: plan.error.message, field: plan.error.field, status: 400 };
  const owned = input.requester.id ? (await getStudentProducts(input.requester.id)).products : [];
  // A tela só mostra os temas dos produtos da aluna; o servidor confere de novo.
  const offered = topicsForProducts(catalog, owned).some(
    (topic) => topic.id === plan.ticket.topicId,
  );
  if (input.channel === 'platform' && !offered)
    return {
      ok: false,
      message: 'Esse tema não é de um produto da sua conta. Escolha outro.',
      field: 'tema',
      status: 400,
    };
  const context: TicketContext = {
    ...input.context,
    product: ticketProduct({
      topicId: plan.ticket.topicId,
      lessonId: input.context.lessonId,
      storePhase: input.context.storePhase,
      owned,
    }),
  };
  // O pedido sem login tem os limites dele (IP e e-mail) e responde igual pra todo mundo: o limite
  // da conta aqui revelaria que aquele e-mail tem cadastro.
  const limit = input.channel === 'platform' ? await checkLimits(input.requester) : null;
  if (limit) return { ok: false, message: limit, status: 429 };
  const topic = findTopic(catalog, plan.ticket.topicId);
  // O id do chamado ainda não existe: os anexos ganham uma pasta própria e o banco liga depois.
  const folder = crypto.randomUUID();
  let attachments: StoredAttachment[] = [];
  let refused: RefusedAttachment[] = [];
  try {
    ({ stored: attachments, refused } = await storeAttachments(folder, input.files));
  } catch (error) {
    return { ok: false, message: attachmentErrorMessage(error), field: 'anexos', status: 400 };
  }
  let ticket: TicketRow;
  try {
    ticket = await createTicket({
      planned: plan.ticket,
      requester: input.requester,
      channel: input.channel,
      context,
      assistantAnswerId: input.assistantAnswerId,
      defaultAssigneeId: topic?.defaultAssigneeId ?? null,
      attachments,
      submissionId,
      maxOpenTickets: MAX_OPEN_TICKETS,
    });
  } catch (error) {
    await removeStoredAttachments(attachments);
    // Dois envios iguais ao mesmo tempo: o segundo bate no índice único e devolve o primeiro.
    const twin =
      submissionId && (isUniqueViolation(error) || error instanceof TicketActionError)
        ? await findSubmittedTicket(submissionId, input.requester)
        : null;
    if (twin) return finishSubmission(twin, input.channel, null);
    if (error instanceof TicketActionError)
      return { ok: false, message: error.message, status: error.status };
    console.error('[support] não foi possível abrir o chamado.');
    return { ok: false, message: 'Não foi possível enviar agora. Tente de novo.', status: 500 };
  }
  void notifyTicketCreated(ticket).catch(() =>
    console.error('[support] Ticket creation notification failed.'),
  );
  return finishSubmission(ticket, input.channel, refusedFilesNotice(refused));
}

async function finishSubmission(
  ticket: TicketRow,
  channel: 'platform' | 'public_form',
  notice: string | null,
): Promise<CreateOutcome> {
  // A retry can resend the access link, but cannot delete files or create another ticket.
  if (channel === 'public_form') {
    try {
      await sendPublicTicketLink(ticket);
    } catch {
      console.error('[support] Public ticket access link could not be sent.');
      return {
        ok: false,
        message:
          'Seu chamado foi salvo, mas não foi possível enviar o link por e-mail agora. Tente enviar novamente para receber o link.',
        status: 500,
      };
    }
  }
  return { ok: true, ticket, notice };
}

async function checkLimits(requester: Requester): Promise<string | null> {
  if (!requester.id) return null;
  if (!(await consumeAttempt('supportTicketsPerUserPerDay', requester.id)))
    return 'Você abriu muitos chamados hoje. Responda os que já estão abertos ou tente amanhã.';
  return null;
}

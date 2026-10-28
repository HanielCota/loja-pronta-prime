'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/features/admin/server/access';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { db } from '@/server/db';
import { supportContacts, supportFaqFeedback, supportTickets } from '@/server/db/schema';
import { parseSupportPhones, type SupportTopicId } from '../contacts';
import { notifyRequesterReplied } from './notify';
import { countMyUnread } from './queries';
import {
  closeByRequester,
  markTicketRead,
  rateTicket,
  reopenNotResolved,
  ticketFromPublicToken,
  TicketActionError,
  undoRequesterClose,
  type TicketRow,
} from './tickets';

export type SupportSettingsResult = {
  saved: boolean;
  message: string;
  field?: SupportTopicId;
};

export async function saveSupportContacts(
  _previous: SupportSettingsResult,
  form: FormData,
): Promise<SupportSettingsResult> {
  await requireAdmin('/admin/suporte');
  const parsed = parseSupportPhones(form);
  if (!parsed.ok) return { saved: false, message: parsed.message, field: parsed.field };
  await db.transaction(async (tx) => {
    for (const [topic, phone] of Object.entries(parsed.phones)) {
      await tx
        .insert(supportContacts)
        .values({ topic, phone })
        .onConflictDoUpdate({
          target: supportContacts.topic,
          set: { phone, updatedAt: new Date() },
        });
    }
  });
  revalidatePath('/admin/suporte');
  revalidatePath('/admin/suporte/configuracoes');
  revalidatePath('/perfil');
  revalidatePath('/suporte');
  return { saved: true, message: 'Contatos de suporte salvos.' };
}

export type TicketActionState = { ok: boolean; message: string };

type Requester = { ticket: TicketRow; id: string | null; name: string; path: string };

/**
 * Quem está agindo no chamado: a dona (logada) ou o link mágico. Entrando como aluna, a equipe
 * não encerra nem avalia por ela (o servidor recusa).
 */
async function requester(form: FormData): Promise<Requester | null> {
  const number = Number(form.get('numero'));
  const token = String(form.get('token') ?? '');
  if (token) {
    const ticket = await ticketFromPublicToken(token);
    if (!ticket || ticket.number !== number) return null;
    return { ticket, id: null, name: ticket.requesterName, path: `/suporte/acesso/${token}` };
  }
  const state = await getSessionState();
  if (state.status !== 'active' || needsFirstPassword(state.session.user)) return null;
  if (!Number.isInteger(number)) return null;
  const { user } = state.session;
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.number, number), eq(supportTickets.requesterId, user.id)))
    .limit(1);
  if (!ticket?.emailConfirmedAt) return null;
  return {
    ticket,
    id: user.id,
    name: user.preferredName?.trim() || user.name,
    path: `/suporte/${number}`,
  };
}

async function act(
  form: FormData,
  change: (who: Requester) => Promise<unknown>,
  success: string,
  options: { revalidate?: boolean } = {},
): Promise<TicketActionState> {
  const who = await requester(form);
  if (!who) return { ok: false, message: 'Chamado não encontrado.' };
  try {
    await change(who);
  } catch (error) {
    if (error instanceof TicketActionError) return { ok: false, message: error.message };
    console.error('[support] não foi possível mudar o chamado.');
    return { ok: false, message: 'Não foi possível salvar agora. Tente de novo.' };
  }
  // "Sim, resolveu" não recarrega a página na hora: os 5 segundos pra desfazer ficam na tela.
  if (options.revalidate === false) return { ok: true, message: success };
  revalidatePath(who.path);
  revalidatePath('/suporte');
  return { ok: true, message: success };
}

/** "Sim, resolveu" e "Encerrar chamado". */
export async function closeTicketAction(
  _state: TicketActionState,
  form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('closeTicketAction', async () => {
    return act(
      form,
      (who) => closeByRequester(who.ticket.id, who.id),
      'Chamado encerrado. Se precisar, é só responder que ele reabre.',
    );
  });
}

/** "Sim, resolveu": encerra sem recarregar a página (a tela mostra o desfazer por 5 segundos). */
export async function resolveTicketAction(
  _state: TicketActionState,
  form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('resolveTicketAction', async () => {
    return act(form, (who) => closeByRequester(who.ticket.id, who.id), 'Chamado encerrado.', {
      revalidate: false,
    });
  });
}

/** Desfaz o "Sim, resolveu" nos primeiros segundos. */
export async function undoCloseAction(
  _state: TicketActionState,
  form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('undoCloseAction', async () => {
    return act(
      form,
      (who) => undoRequesterClose(who.ticket.id, who.id),
      'Pronto, o chamado continua aberto.',
    );
  });
}

/** "Ainda não": responde na hora e devolve o chamado pra fila (não só preenche a caixa). */
export async function notResolvedAction(
  _state: TicketActionState,
  form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('notResolvedAction', async () => {
    return act(
      form,
      async (who) => {
        const ticket = await reopenNotResolved(who.ticket.id, { id: who.id, name: who.name });
        void notifyRequesterReplied(ticket).catch(() =>
          console.error('[support] aviso à responsável falhou.'),
        );
      },
      'Avisamos o suporte que ainda não resolveu.',
    );
  });
}

export async function rateAction(
  _state: TicketActionState,
  form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('rateAction', async () => {
    const rating = Number(form.get('nota'));
    const comment = String(form.get('comentario') ?? '');
    return act(
      form,
      (who) => rateTicket(who.ticket.id, who.id, rating, comment),
      'Obrigada pela avaliação!',
    );
  });
}

/** Liga ou desliga o aviso por e-mail das respostas deste chamado. */
export async function emailRepliesAction(
  _state: TicketActionState,
  form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('emailRepliesAction', async () => {
    const enabled = form.get('email') === '1';
    return act(
      form,
      (who) =>
        db
          .update(supportTickets)
          .set({ emailReplies: enabled })
          .where(eq(supportTickets.id, who.ticket.id)),
      enabled
        ? 'Você vai receber as respostas por e-mail.'
        : 'Você não vai mais receber as respostas por e-mail.',
    );
  });
}

/** Marca como lido até a mensagem que apareceu na tela. Visitando a conta, não conta. */
export async function markMyTicketRead(number: number, messageId: string): Promise<void> {
  return runAsStudent('markMyTicketRead', async () => {
    const state = await getSessionState();
    if (state.status !== 'active' || state.session.session.impersonatedBy) return;
    const form = new FormData();
    form.set('numero', String(number));
    const who = await requester(form);
    if (!who?.id) return;
    await markTicketRead(who.ticket.id, who.id, messageId);
  });
}

/** "Resolveu" / "Ainda preciso de ajuda" na resposta automática (alimenta o Desempenho). */
export async function faqFeedbackAction(
  answerId: string,
  topicId: string,
  situationId: string | null,
  resolved: boolean,
) {
  return runAsStudent('faqFeedbackAction', async () => {
    const state = await getSessionState();
    if (state.status !== 'active') return;
    if (!/^[\w-]{1,64}$/.test(answerId) || !/^[\w-]{1,32}$/.test(topicId)) return;
    await db.insert(supportFaqFeedback).values({
      answerId,
      topicId,
      situationId: situationId && /^[\w-]{1,64}$/.test(situationId) ? situationId : null,
      resolved,
      userId: state.session.session.impersonatedBy ? null : state.session.user.id,
    });
  });
}

/** O número ao lado de "Meus chamados" no menu da conta. */
export async function getMyUnreadSupportCount(): Promise<number> {
  return runAsStudent('getMyUnreadSupportCount', async () => {
    const state = await getSessionState();
    if (state.status !== 'active') return 0;
    return countMyUnread(state.session.user.id);
  });
}

import { SUPPORT_EMAIL_NOTIFICATIONS_ENABLED } from '../email-policy';
import { absoluteUrl, sendEmailInBackground } from '@/server/email/send';
import { ticketCode } from '../copy';
import {
  newTicketToStaffEmail,
  publicTicketLinkEmail,
  replyToRequesterEmail,
  requesterRepliedEmail,
} from '../email-messages';
import { hasStaffPermission } from '../staff-access';
import { issuePublicLink, loadStaffDirectory, PUBLIC_LINK_DAYS, type TicketRow } from './tickets';

/**
 * Avisos do suporte por e-mail. Sempre depois de gravar e sem esperar: falha no envio é
 * registrada e nunca derruba a mensagem. Nunca leva o texto do chamado.
 */

function staffTicketUrl(ticket: TicketRow) {
  return absoluteUrl(`/admin/chamados/${ticket.number}`);
}

/** Chamado novo: avisa a responsável, ou a equipe disponível quando ficou na fila. */
export async function notifyTicketCreated(ticket: TicketRow) {
  if (!SUPPORT_EMAIL_NOTIFICATIONS_ENABLED) return;
  const staff = await loadStaffDirectory();
  const permission = ticket.queue === 'ombudsman' ? 'support.ombudsman' : 'support.answer';
  const recipients = ticket.assigneeId
    ? staff.filter((member) => member.id === ticket.assigneeId)
    : staff.filter((member) => member.available && hasStaffPermission(member.role, permission));
  const message = newTicketToStaffEmail(ticketCode(ticket.number), ticket.subject, staffTicketUrl(ticket));
  for (const member of recipients)
    sendEmailInBackground(
      { to: member.email, ...message, idempotencyKey: `ticket:${ticket.id}:created:${member.id}` },
      'support',
    );
}

/** A aluna respondeu: avisa a responsável (no SellBridge ninguém era avisado). */
export async function notifyRequesterReplied(ticket: TicketRow) {
  if (!SUPPORT_EMAIL_NOTIFICATIONS_ENABLED) return;
  if (!ticket.assigneeId) return;
  const staff = await loadStaffDirectory();
  const assignee = staff.find((member) => member.id === ticket.assigneeId);
  if (!assignee) return;
  sendEmailInBackground(
    {
      to: assignee.email,
      ...requesterRepliedEmail(ticketCode(ticket.number), ticket.subject, staffTicketUrl(ticket)),
      idempotencyKey: `ticket:${ticket.id}:requester-reply:${ticket.updatedAt.toISOString()}`,
    },
    'support',
  );
}

/** A equipe respondeu: avisa a aluna (link mágico renovado no chamado público). */
export async function notifyStaffReplied(ticket: TicketRow) {
  if (!SUPPORT_EMAIL_NOTIFICATIONS_ENABLED) return;
  if (!ticket.emailReplies) return;
  const path =
    ticket.channel === 'public_form'
      ? `/suporte/acesso/${await issuePublicLink(ticket.id)}`
      : `/suporte/${ticket.number}`;
  sendEmailInBackground(
    {
      to: ticket.requesterEmail,
      ...replyToRequesterEmail(ticket.subject, absoluteUrl(path)),
      idempotencyKey: `ticket:${ticket.id}:reply:${ticket.updatedAt.toISOString()}`,
    },
    'support',
  );
}

/** O link do chamado aberto sem login. */
export async function sendPublicTicketLink(ticket: TicketRow) {
  const token = await issuePublicLink(ticket.id);
  sendEmailInBackground(
    {
      to: ticket.requesterEmail,
      ...publicTicketLinkEmail(ticket.subject, absoluteUrl(`/suporte/acesso/${token}`), PUBLIC_LINK_DAYS),
      idempotencyKey: `ticket:${ticket.id}:public-link:${token.slice(0, 8)}`,
    },
    'support-access',
  );
}

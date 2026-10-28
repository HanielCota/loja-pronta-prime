import { SUPPORT_EMAIL_ENABLED } from '../email-policy';
import { Info } from 'lucide-react';
import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import type { SupportTopic } from '../catalog';
import { describeTopic } from '../catalog';
import { customerEventSentence, customerStateLine, ticketCode } from '../copy';
import type { SupportSchedule } from '../support-hours';
import type { RequesterThread } from '../thread';
import { MessageList, type ThreadMessage } from './message-list';
import { ReplyForm } from './reply-form';
import { SupportHoursNote } from './support-hours-note';
import { TicketStatusBadge } from './ticket-badges';
import { CloseTicketForm, EmailRepliesToggle, MarkRead, RatingForm, ResolutionPrompt } from './ticket-decisions';

type Thread = RequesterThread;

/**
 * A conversa do chamado na visão da aluna (logada ou pelo link mágico): a linha de situação no
 * topo, as mensagens e os eventos que ela pode ver, a pergunta "resolveu?" e a resposta.
 */
export function RequesterTicketView({
  thread,
  now,
  catalog,
  schedule,
  autoCloseDays,
  hours,
  pause,
  token,
  sendError,
  sendNotice,
}: {
  thread: Thread;
  /** A hora da leitura (o servidor lê o relógio uma vez). */
  now: Date;
  catalog: readonly SupportTopic[];
  schedule: SupportSchedule;
  autoCloseDays: number;
  hours: string;
  pause: string | null;
  token?: string | undefined;
  sendError?: string | null | undefined;
  /** O envio deu certo, mas algo ficou de fora (anexo recusado), vindo da URL sem JavaScript. */
  sendNotice?: string | null | undefined;
}) {
  const { ticket } = thread;

  const topicLabel = (id: string) => catalog.find((topic) => topic.id === id)?.label ?? 'Outra coisa';
  const { topic, situation } = describeTopic(catalog, ticket.topicId, ticket.situationId);
  const byMessage = new Map<string, Thread['attachments']>();
  for (const file of thread.attachments) byMessage.set(file.messageId, [...(byMessage.get(file.messageId) ?? []), file]);
  const messages: ThreadMessage[] = thread.messages.map((message) => ({
    id: message.id,
    authorName: message.authorName,
    fromStaff: message.fromStaff,
    internal: false,
    body: message.body,
    createdAt: message.createdAt,
    attachments: (byMessage.get(message.id) ?? []).map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      purged: Boolean(file.purgedAt),
    })),
  }));
  const events = thread.events.flatMap((event) => {
    const sentence = customerEventSentence(event, topicLabel);
    return sentence ? [{ id: event.id, createdAt: event.createdAt, sentence }] : [];
  });
  const lastStaff = messages.findLast((message) => message.fromStaff);
  const lastOwn = messages.findLast((message) => !message.fromStaff);
  const last = messages.at(-1);
  const seen = lastOwn && thread.staffReadAt && thread.staffReadAt.getTime() >= lastOwn.createdAt.getTime();
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
  const attachmentHref = (id: string, inline: boolean) =>
    `/api/suporte/anexos/${id}?${inline ? 'inline=1' : 'download=1'}${tokenQuery}`;
  const state = customerStateLine(
    {
      status: ticket.status,
      dueAt: ticket.dueAt,
      closedReason: ticket.closedReason,
      lastStaffReplyAt: lastStaff?.createdAt ?? null,
    },
    now,
    schedule,
    autoCloseDays,
  );

  return (
    <>
      <section aria-labelledby="ticket-state" className={cn(panelCard, 'gap-3')}>
        <div className="flex flex-wrap items-center gap-3">
          <TicketStatusBadge status={ticket.status} />
          <span className="text-sm text-muted-foreground">
            Chamado {ticketCode(ticket.number)} · {topic}
            {situation ? ` · ${situation}` : ''}
          </span>
        </div>
        <output id="ticket-state" className="block text-body font-semibold text-pretty">
          {state}
        </output>
        {ticket.status === 'open' ? <SupportHoursNote hours={hours} notice={null} pause={pause} /> : null}
        {thread.lessonTitle || ticket.storePhase ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="size-4" />
            Vai junto com: {thread.lessonTitle ? `Aula: ${thread.lessonTitle}` : `Fase ${ticket.storePhase} da Loja Pronta`}
          </p>
        ) : null}
      </section>

      <section aria-label="Conversa" className={cn(panelCard, 'gap-6')}>
        <MessageList
          messages={messages}
          events={events}
          side="requester"
          attachmentHref={attachmentHref}
          footer={
            <div className="flex flex-col gap-4">
              {lastOwn && last?.id === lastOwn.id ? (
                <p className="text-right text-sm text-muted-foreground">
                  {seen ? 'Visto pelo suporte' : 'Enviado · ainda não visto pelo suporte'}
                </p>
              ) : null}
              {ticket.status === 'answered' && lastStaff && last?.id === lastStaff.id ? (
                <ResolutionPrompt number={ticket.number} token={token} />
              ) : null}
              {ticket.status === 'closed' && ticket.rating === null ? <RatingForm number={ticket.number} token={token} /> : null}
              {ticket.status === 'closed' && ticket.rating !== null ? (
                <p className="text-body text-muted-foreground">Você avaliou este atendimento com {ticket.rating} de 5. Obrigada!</p>
              ) : null}
            </div>
          }
        />
        <span id="fim" />
        {sendError ? (
          <p role="alert" className="text-body text-destructive">
            {sendError}
          </p>
        ) : null}
        {sendNotice ? (
          <output className="block text-body text-destructive">Mensagem enviada. {sendNotice}</output>
        ) : null}
        <ReplyForm number={ticket.number} closed={ticket.status === 'closed'} token={token} />
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-start sm:justify-between">
          {ticket.status !== 'closed' ? <CloseTicketForm number={ticket.number} token={token} /> : <span />}
          <div className="flex flex-col gap-1 sm:items-end">
            {SUPPORT_EMAIL_ENABLED ? (
              <EmailRepliesToggle number={ticket.number} enabled={ticket.emailReplies} token={token} />
            ) : (
              <p className="text-body text-muted-foreground">Acompanhe as respostas aqui no suporte. Os avisos por e-mail estão desativados.</p>
            )}
          </div>
        </div>
      </section>
      {last && !token ? <MarkRead number={ticket.number} messageId={last.id} /> : null}
    </>
  );
}

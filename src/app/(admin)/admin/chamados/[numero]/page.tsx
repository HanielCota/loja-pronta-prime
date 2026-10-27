import { readClock } from '@/features/support/clock';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { AutoRefresh } from '@/features/admin/components/auto-refresh';
import { hasAdminRole } from '@/features/admin/access';
import { panelCard } from '@/features/member/components/area-shell';
import { accessValidityLabel } from '@/features/products/access-validity';
import { PRODUCTS } from '@/features/products/catalog';
import { describeTopic } from '@/features/support/catalog';
import { PRIORITY_LABELS, staffEventSentence, STATUS_LABELS, ticketCode } from '@/features/support/copy';
import { formatMoment, MessageList, type ThreadMessage } from '@/features/support/components/message-list';
import { DeadlineBadge, TicketPriorityBadge, TicketStatusBadge } from '@/features/support/components/ticket-badges';
import { MarkRead } from '@/features/support/components/ticket-decisions';
import { hasStaffPermission } from '@/features/support/staff-access';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { requireStaff } from '@/features/support/server/staff-guard';
import { deadlineBadge } from '@/features/support/ticket-rules';
import {
  AssigneeForm,
  PriorityForm,
  QueueForm,
  StatusButton,
  TopicForm,
} from '@/features/support-desk/components/desk-forms';
import { ImpersonateButton } from '@/features/support-desk/components/impersonate-button';
import { StaffComposer } from '@/features/support-desk/components/staff-composer';
import { markReadAction } from '@/features/support-desk/server/actions';
import { getStaffTicket } from '@/features/support-desk/server/queries';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Chamado', robots: { index: false, follow: false } };

const sideTitle = 'text-body font-semibold';
const detailRow = 'flex flex-col gap-0.5 text-body';

/**
 * Um chamado na visão da equipe: a conversa (com notas internas e citação), o composer e, ao
 * lado, o atendimento (responsável, prioridade, tema, fila, prazo, histórico) e a aluna.
 */
export default async function StaffTicketPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const session = await requireStaff(`/admin/chamados/${numero}`, 'support.answer');
  const { user } = session;
  const viewer = { id: user.id, role: user.role };
  const [detail, catalog] = await Promise.all([getStaffTicket(Number(numero), viewer), loadSupportCatalog()]);
  if (!detail) notFound();
  const { ticket, requester } = detail;
  const now = readClock();
  const staffName = user.preferredName?.trim() || user.name;
  const topicLabel = (id: string) => catalog.find((topic) => topic.id === id)?.label ?? 'Outra coisa';
  const { topic, situation } = describeTopic(catalog, ticket.topicId, ticket.situationId);
  const nameOf = (id: string | null) => detail.staff.find((member) => member.id === id)?.name ?? null;
  const activeAssignee =
    ticket.assigneeId && detail.staff.some((member) => member.id === ticket.assigneeId && hasStaffPermission(member.role, 'support.answer'))
      ? { id: ticket.assigneeId, name: nameOf(ticket.assigneeId) ?? 'Ex-membro da equipe' }
      : null;
  const imageOf = (id: string | null) =>
    id === ticket.requesterId ? (requester?.image ?? null) : (detail.staff.find((member) => member.id === id)?.image ?? null);
  const messages: ThreadMessage[] = detail.messages.map((message) => ({
    id: message.id,
    authorName: message.authorName,
    authorImage: imageOf(message.authorId),
    fromStaff: message.fromStaff,
    internal: message.internal,
    body: message.body,
    createdAt: message.createdAt,
    attachments: detail.attachments
      .filter((file) => file.messageId === message.id)
      .map((file) => ({ id: file.id, fileName: file.fileName, mimeType: file.mimeType, purged: Boolean(file.purgedAt) })),
  }));
  const events = detail.events.map((event) => ({
    id: event.id,
    createdAt: event.createdAt,
    sentence: staffEventSentence(
      {
        ...event,
        actorName: event.automatic ? null : (nameOf(event.actorId) ?? (event.actorId === ticket.requesterId ? ticket.requesterName : null)),
        targetName: event.toValue ? nameOf(event.toValue) : null,
      },
      topicLabel,
    ),
  }));
  const requesterRead = detail.reads.find((read) => read.userId === ticket.requesterId)?.readAt ?? null;
  const lastStaffPublic = messages.findLast((message) => message.fromStaff && !message.internal);
  const deadline = deadlineBadge(ticket, now);
  const last = messages.at(-1);
  const canOmbudsman = hasStaffPermission(user.role, 'support.ombudsman');
  const answerStaff = detail.staff.filter((member) =>
    hasStaffPermission(member.role, ticket.queue === 'ombudsman' ? 'support.ombudsman' : 'support.answer'),
  );
  const unconfirmed = ticket.channel === 'public_form' && !ticket.emailConfirmedAt;

  return (
    <AdminPage
      title={`${ticketCode(ticket.number)} · ${ticket.subject}`}
      intro={`${topic}${situation ? ` · ${situation}` : ''} · aberto em ${formatMoment(ticket.createdAt)}`}
      backLink={{ href: '/admin/chamados', label: 'Chamados' }}
    >
      <AutoRefresh everyMs={15_000} />
      <div className="flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <TicketPriorityBadge priority={ticket.priority} />
        {deadline ? <DeadlineBadge {...deadline} /> : null}
        {ticket.queue === 'ombudsman' ? <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">Ouvidoria</span> : null}
        {ticket.channel === 'public_form' ? <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">Formulário de acesso</span> : null}
      </div>
      {unconfirmed ? (
        <div role="alert" className="flex gap-3 rounded-card bg-destructive-soft px-6 py-4 text-body text-destructive">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong className="font-semibold">E-mail ainda não confirmado:</strong> não altere nada na conta por este chamado. Quem abriu ainda não abriu o link que mandamos pro e-mail.
          </p>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="Conversa" className={cn(panelCard, 'gap-6 !p-5 sm:!p-6')}>
            <MessageList
              messages={messages}
              events={events}
              side="staff"
              attachmentHref={(id, inline) => `/api/suporte/anexos/${id}${inline ? '?inline=1' : ''}`}
              quotable
              footer={
                lastStaffPublic && last?.id === lastStaffPublic.id ? (
                  <p className="text-right text-sm text-muted-foreground">
                    {requesterRead && requesterRead.getTime() >= lastStaffPublic.createdAt.getTime() ? 'Vista pela aluna' : 'Ainda não vista pela aluna'}
                  </p>
                ) : null
              }
            />
            {ticket.status === 'closed' ? (
              <div className="flex flex-col gap-3 rounded-3xl bg-muted p-5">
                <p className="text-body">Este chamado está encerrado. Pra responder, reabra. Notas internas continuam liberadas.</p>
                <StatusButton number={ticket.number} next="open" label="Reabrir chamado" variant="soft" />
              </div>
            ) : null}
            <StaffComposer
              number={ticket.number}
              requesterName={ticket.requesterName}
              subject={ticket.subject}
              staffName={staffName}
              templates={detail.templates.map((template) => ({ id: template.id, title: template.title, body: template.body, statusAfter: template.statusAfter }))}
              closed={ticket.status === 'closed'}
            />
            {ticket.status !== 'closed' ? <StatusButton number={ticket.number} next="closed" label="Encerrar sem responder" /> : null}
          </section>
        </div>
        <aside aria-label="Atendimento e aluna" className="flex flex-col gap-6 xl:sticky xl:top-6">
          <section aria-labelledby="triage-title" className={cn(panelCard, 'gap-4 !p-5')}>
            <h2 id="triage-title" className={sideTitle}>
              Atendimento
            </h2>
            <AssigneeForm
              number={ticket.number}
              current={activeAssignee}
              canAssignOthers={hasStaffPermission(user.role, 'support.assign_others')}
              viewerId={user.id}
              staff={answerStaff.map((member) => ({ id: member.id, name: member.name }))}
            />
            <PriorityForm number={ticket.number} value={ticket.priority} labels={PRIORITY_LABELS} />
            <TopicForm number={ticket.number} value={ticket.topicId} topics={catalog.map((item) => ({ id: item.id, label: item.label }))} />
            {canOmbudsman ? <QueueForm number={ticket.number} value={ticket.queue} /> : null}
            <div className={detailRow}>
              <span className="text-sm font-semibold text-muted-foreground">Prazo de resposta</span>
              <span>
                {ticket.status === 'closed'
                  ? 'Encerrado'
                  : ticket.status === 'answered' || !ticket.dueAt
                    ? 'Aguardando a aluna'
                    : `${formatMoment(ticket.dueAt)}${deadline ? ` · ${deadline.label}` : ''}`}
              </span>
            </div>
            <div className={detailRow}>
              <span className="text-sm font-semibold text-muted-foreground">Primeira resposta</span>
              <span>{ticket.firstResponseAt ? formatMoment(ticket.firstResponseAt) : 'Ainda não respondido'}</span>
            </div>
            <div className={detailRow}>
              <span className="text-sm font-semibold text-muted-foreground">Avaliação da aluna</span>
              <span>{ticket.rating ? `${ticket.rating} de 5${ticket.ratingComment ? ` · “${ticket.ratingComment}”` : ''}` : 'Sem avaliação'}</span>
            </div>
            {ticket.assistantAnswerId ? (
              <div className={detailRow}>
                <span className="text-sm font-semibold text-muted-foreground">Antes de abrir</span>
                <span>Viu a resposta automática “{ticket.assistantAnswerId}” e ainda precisou de ajuda.</span>
              </div>
            ) : null}
            <details className="group">
              <summary className="min-h-11 cursor-pointer py-2 text-body font-semibold text-link">Histórico ({events.length})</summary>
              <ol className="mt-2 flex flex-col gap-2 text-sm">
                {events.map((event) => (
                  <li key={event.id}>
                    {event.sentence} <span className="text-muted-foreground">· {formatMoment(event.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
          <section aria-labelledby="requester-title" className={cn(panelCard, 'gap-4 !p-5')}>
            <h2 id="requester-title" className={sideTitle}>
              Aluna
            </h2>
            <div className={detailRow}>
              <span className="font-semibold break-words">{requester?.displayName ?? ticket.requesterName}</span>
              <span className="text-muted-foreground break-words">{ticket.requesterEmail}</span>
            </div>
            {requester ? (
              <>
                <p className="text-body">
                  {requester.online ? 'Online agora' : requester.lastSeenAt ? `Último acesso: ${formatMoment(requester.lastSeenAt)}` : 'Sem acesso registrado'}
                </p>
                <div className={detailRow}>
                  <span className="text-sm font-semibold text-muted-foreground">Produtos</span>
                  {requester.products.length ? (
                    <ul className="flex flex-col gap-1">
                      {requester.products.map((product) => {
                        const validity = requester.validity.byProduct[product];
                        return (
                          <li key={product}>
                            {PRODUCTS[product].name}
                            {validity ? <span className="text-muted-foreground"> · {accessValidityLabel(validity, requester.validity.checkedAt)}</span> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">Nenhum produto liberado</span>
                  )}
                </div>
                {requester.storePhase ? (
                  <div className={detailRow}>
                    <span className="text-sm font-semibold text-muted-foreground">Loja Pronta</span>
                    <span>Fase {requester.storePhase}</span>
                  </div>
                ) : null}
                {requester.lastLesson ? (
                  <div className={detailRow}>
                    <span className="text-sm font-semibold text-muted-foreground">Última aula vista</span>
                    <span>
                      {requester.lastLesson.title} · {formatMoment(requester.lastLesson.viewedAt)}
                    </span>
                  </div>
                ) : null}
                {requester.otherTickets.length ? (
                  <div className={detailRow}>
                    <span className="text-sm font-semibold text-muted-foreground">Outros chamados</span>
                    <ul className="flex flex-col gap-1">
                      {requester.otherTickets.map((other) => (
                        <li key={other.number}>
                          <Link className="text-link hover:underline" href={`/admin/chamados/${other.number}`}>
                            {ticketCode(other.number)} {other.subject}
                          </Link>{' '}
                          <span className="text-sm text-muted-foreground">· {STATUS_LABELS[other.status]}</span>
                        </li>
                      ))}
                    </ul>
                    <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-link hover:underline" href={`/admin/chamados?q=${encodeURIComponent(ticket.requesterEmail)}`}>
                      Ver todos
                    </Link>
                  </div>
                ) : null}
                {hasAdminRole(user.role) ? (
                  <Link className="inline-flex min-h-11 items-center gap-2 text-body font-semibold text-link hover:underline" href={`/admin/contas/${requester.id}`}>
                    Ver conta
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </Link>
                ) : null}
                {hasStaffPermission(user.role, 'support.impersonate') && requester.id !== user.id && !unconfirmed ? (
                  <ImpersonateButton userId={requester.id} ticketNumber={ticket.number} name={requester.displayName} />
                ) : null}
              </>
            ) : (
              <p className="text-body text-muted-foreground">Sem conta na plataforma (chamado pelo formulário de acesso).</p>
            )}
            {ticket.lessonId || ticket.storePhase || ticket.errorDigest || ticket.pagePath ? (
              <div className={detailRow}>
                <span className="text-sm font-semibold text-muted-foreground">Contexto do chamado</span>
                {ticket.lessonId ? (
                  <Link className="text-link hover:underline" href={`/sll/aula/${ticket.lessonId}`}>
                    Abrir a aula
                  </Link>
                ) : null}
                {ticket.storePhase ? <span>Fase {ticket.storePhase} da Loja Pronta</span> : null}
                {ticket.pagePath ? <span>Página: {ticket.pagePath}</span> : null}
                {ticket.errorDigest ? <span>Código do erro: {ticket.errorDigest}</span> : null}
              </div>
            ) : null}
          </section>
        </aside>
      </div>
      {last ? <MarkRead number={ticket.number} messageId={last.id} onRead={markReadAction} /> : null}
    </AdminPage>
  );
}

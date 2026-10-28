import { FileText, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { QuoteButton } from '@/features/support-desk/components/staff-composer';

export type ThreadMessage = {
  id: string;
  authorName: string;
  authorImage?: string | null;
  fromStaff: boolean;
  internal: boolean;
  body: string;
  createdAt: Date;
  attachments: { id: string; fileName: string; mimeType: string; purged: boolean }[];
};

export type ThreadEvent = { id: number; createdAt: Date; sentence: string };

type Item = { kind: 'message'; at: number; message: ThreadMessage } | { kind: 'event'; at: number; event: ThreadEvent };

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

export function formatMoment(moment: Date): string {
  return timeFormat.format(moment).replace(',', ' às');
}

/**
 * A conversa: mensagens e eventos na ordem em que aconteceram. Quem lê a lista é sempre o
 * "lado" da tela: as mensagens desse lado ficam à direita. Nota interna tem cadeado e o texto
 * "Nota interna" (nunca só a cor).
 */
export function MessageList({
  messages,
  events,
  side,
  attachmentHref,
  footer,
  quotable = false,
}: {
  messages: readonly ThreadMessage[];
  events: readonly ThreadEvent[];
  side: 'requester' | 'staff';
  attachmentHref: (id: string, inline: boolean) => string;
  footer?: ReactNode;
  /** A equipe cita mensagens no composer ("Citar mensagem"). */
  quotable?: boolean;
}) {
  const items: Item[] = [
    ...messages.map((message) => ({ kind: 'message' as const, at: message.createdAt.getTime(), message })),
    ...events.map((event) => ({ kind: 'event' as const, at: event.createdAt.getTime(), event })),
  ].toSorted((a, b) => a.at - b.at);
  return (
    <ol aria-label="Conversa do chamado" className="flex flex-col gap-4">
      {items.map((item) =>
        item.kind === 'event' ? (
          <li key={`event-${item.event.id}`} className="text-center text-sm text-muted-foreground">
            {item.event.sentence} · {formatMoment(item.event.createdAt)}
          </li>
        ) : (
          <MessageItem
            key={item.message.id}
            message={item.message}
            mine={side === 'staff' ? item.message.fromStaff : !item.message.fromStaff}
            attachmentHref={attachmentHref}
            action={quotable ? <QuoteButton author={item.message.authorName} body={item.message.body} /> : null}
          />
        ),
      )}
      {footer ? <li>{footer}</li> : null}
    </ol>
  );
}

function MessageItem({
  message,
  mine,
  attachmentHref,
  action,
}: {
  message: ThreadMessage;
  mine: boolean;
  attachmentHref: (id: string, inline: boolean) => string;
  action?: ReactNode;
}) {
  return (
    <li id={`mensagem-${message.id}`} className={cn('flex gap-3', mine ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar name={message.authorName} image={message.authorImage ?? null} className="size-10 shrink-0 text-sm" />
      <div
        className={cn(
          'flex max-w-[85%] min-w-0 flex-col gap-2 rounded-3xl px-5 py-4 forced-colors:border forced-colors:border-[CanvasText]',
          message.internal ? 'border border-dashed border-border bg-card' : mine ? 'bg-primary-soft' : 'bg-muted',
        )}
      >
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {message.internal ? (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Lock aria-hidden="true" className="size-4" />
              Nota interna ·
            </span>
          ) : null}
          <span className="font-semibold text-foreground">{message.authorName}</span>
          {message.fromStaff && !message.internal ? <span>· Suporte</span> : null}
          <span>· {formatMoment(message.createdAt)}</span>
        </p>
        <p className="text-body break-words whitespace-pre-wrap">{message.body}</p>
        {message.attachments.length ? (
          <ul className="flex flex-wrap gap-2">
            {message.attachments.map((file) => (
              <li key={file.id}>
                {file.purged ? (
                  <span className="text-sm text-muted-foreground">{file.fileName} (apagado pela política de guarda)</span>
                ) : file.mimeType.startsWith('image/') ? (
                  <a href={attachmentHref(file.id, true)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-ring">
                    {/* eslint-disable-next-line @next/next/no-img-element -- anexo privado, servido pela rota com sessão */}
                    <img src={attachmentHref(file.id, true)} alt={`Anexo: ${file.fileName}`} className="max-h-48 max-w-full object-contain" loading="lazy" />
                  </a>
                ) : (
                  <a href={attachmentHref(file.id, false)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    <FileText aria-hidden="true" className="size-4" />
                    {file.fileName}
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {action}
      </div>
    </li>
  );
}

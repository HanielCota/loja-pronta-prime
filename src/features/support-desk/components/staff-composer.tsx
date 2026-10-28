'use client';

import { SelectMenu } from '@/components/ui/select-menu';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Quote, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { cn } from '@/lib/utils';
import { MAX_DESCRIPTION } from '@/features/support/plan-ticket';
import { fillTemplate } from '@/features/support/reply-templates';
import type { TicketStatus } from '@/features/support/ticket-rules';
import {
  appendAttachments,
  AttachmentPicker,
  useAttachments,
} from '@/features/support/components/attachment-picker';

const QUOTE_EVENT = 'support:quote';

type Template = { id: string; title: string; body: string; statusAfter: TicketStatus | null };

const SEND_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'answered', label: 'Enviar e marcar respondido' },
  { value: 'open', label: 'Enviar e manter aguardando' },
  { value: 'closed', label: 'Enviar e encerrar' },
];

/** "Citar mensagem": insere a mensagem no composer, no formato de citação de e-mail. */
export function QuoteButton({ author, body }: { author: string; body: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(QUOTE_EVENT, { detail: `> ${author} escreveu:\n${body.split('\n').map((line) => `> ${line}`).join('\n')}\n\n` }))}
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-2 text-sm font-semibold text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Quote aria-hidden="true" className="size-4" />
      Citar mensagem
    </button>
  );
}

/**
 * Resposta da equipe: respostas prontas (com `{aluna}`, `{assunto}`, `{atendente}` e o status que
 * cada uma sugere), anexos, nota interna (só a equipe vê) e o envio com o status escolhido.
 * Ctrl/Cmd+Enter envia. Sem JavaScript, o formulário vai direto pra rota.
 */
export function StaffComposer({
  number,
  requesterName,
  subject,
  staffName,
  templates,
  closed,
}: {
  number: number;
  requesterName: string;
  subject: string;
  staffName: string;
  templates: Template[];
  closed: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(closed);
  const [statusAfter, setStatusAfter] = useState<TicketStatus>('answered');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const attachments = useAttachments();
  const form = useRef<HTMLFormElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onQuote = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setBody((current) => `${current}${current && !current.endsWith('\n') ? '\n' : ''}${detail}`);
      textarea.current?.focus();
    };
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, []);

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    const text = fillTemplate(template.body, { aluna: requesterName, assunto: subject, atendente: staffName });
    setBody((current) => (current.trim() ? `${current.trimEnd()}\n\n${text}` : text));
    if (template.statusAfter) setStatusAfter(template.statusAfter);
    textarea.current?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim().length < (internal ? 2 : 1)) {
      setError('Escreva a mensagem antes de enviar.');
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);
    const data = new FormData(event.currentTarget);
    data.set(ENHANCED_SUBMIT_FIELD, '1');
    appendAttachments(data, attachments.files);
    try {
      const response = await fetch(`/api/suporte/chamados/${number}/mensagens`, { method: 'POST', body: data });
      const result = (await response.json()) as { ok: boolean; message?: string; notice?: string | null };
      if (result.ok) {
        setBody('');
        attachments.clear();
        setSuccess(
          internal
            ? 'Nota interna salva.'
            : statusAfter === 'closed'
              ? 'Resposta enviada e chamado encerrado.'
              : statusAfter === 'open'
                ? 'Resposta enviada; o chamado segue aguardando o suporte.'
                : 'Resposta enviada à aluna.',
        );
        if (result.notice) setError(result.notice);
        router.refresh();
      } else setError(result.message ?? 'Não foi possível enviar agora.');
    } catch {
      setError('Não foi possível enviar agora. O que você escreveu continua aqui.');
    }
    setSending(false);
  }

  const near = body.length >= 4000;

  return (
    <form
      ref={form}
      action={`/api/suporte/chamados/${number}/mensagens`}
      method="post"
      encType="multipart/form-data"
      onSubmit={submit}
      className={cn('flex flex-col gap-3 rounded-3xl p-4 sm:p-5', internal ? 'border border-dashed border-border' : 'bg-muted')}
    >
      <input type="hidden" name="lado" value="equipe" />
      <input type="hidden" name="interna" value={internal ? '1' : '0'} />
      <input type="hidden" name="status_depois" value={statusAfter} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label htmlFor="staff-reply">{internal ? 'Nota interna · só a equipe vê' : 'Resposta para a aluna'}</Label>
        {!closed ? (
          <button
            type="button"
            aria-pressed={internal}
            onClick={() => setInternal((value) => !value)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-ring',
              internal ? 'bg-foreground text-background' : 'bg-card text-foreground hover:bg-primary-soft',
            )}
          >
            <Lock aria-hidden="true" className="size-4" />
            Nota interna
          </button>
        ) : null}
      </div>
      {!internal && templates.length ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff-template">Respostas prontas</Label>
          <SelectMenu
            id="staff-template"
            value=""
            onChange={(event) => {
              applyTemplate(event.target.value);
              event.target.value = '';
            }}
            className="min-h-11 rounded-field border border-input bg-card px-3 text-body"
          >
            <option value="">Escolha uma resposta pronta…</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </SelectMenu>
        </div>
      ) : null}
      <Textarea
        ref={textarea}
        id="staff-reply"
        name="mensagem"
        value={body}
        maxLength={MAX_DESCRIPTION}
        className="bg-card"
        placeholder={internal ? 'Contexto para a equipe: o que foi verificado, próximos passos…' : 'Escreva a resposta…'}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) form.current?.requestSubmit();
        }}
        onPaste={(event) => {
          if (event.clipboardData.files.length) {
            event.preventDefault();
            void attachments.addFiles(event.clipboardData.files);
          }
        }}
      />
      {near ? (
        <p className="text-sm text-muted-foreground">
          {body.length} de {MAX_DESCRIPTION} caracteres
        </p>
      ) : null}
      <AttachmentPicker attachments={attachments} />
      {error ? (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <output className="block text-body text-progress-text">
          {success}
        </output>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
        {!internal ? (
          <div className="flex flex-col gap-2 sm:w-72">
            <Label htmlFor="staff-send-option">Opções de envio</Label>
            <SelectMenu
              id="staff-send-option"
              value={statusAfter}
              onChange={(event) => setStatusAfter(event.target.value as TicketStatus)}
              className="min-h-11 rounded-field border border-input bg-card px-3 text-body"
            >
              {SEND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectMenu>
          </div>
        ) : null}
        <Button type="submit" loading={sending} loadingText="Enviando…" className="sm:w-auto sm:px-8">
          <Send aria-hidden="true" />
          {internal ? 'Salvar nota' : 'Enviar'}
        </Button>
      </div>
    </form>
  );
}

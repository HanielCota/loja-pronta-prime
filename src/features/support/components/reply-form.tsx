'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { MAX_DESCRIPTION } from '../plan-ticket';
import { appendAttachments, AttachmentPicker, useAttachments } from './attachment-picker';

const QUICK_REPLIES = ['Segue o print.', 'Ainda não resolveu.'];
const DRAFT_DELAY_MS = 600;

function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Sem armazenamento (modo privado): o rascunho só não fica guardado.
  }
}

/**
 * A resposta da aluna: texto, anexos (também colando um print ou arrastando arquivos), atalhos
 * de frase e rascunho guardado no aparelho. Ctrl/Cmd+Enter envia. O campo é do navegador (não
 * controlado): o rascunho volta direto pro campo e é salvo a cada pausa na digitação. Sem
 * JavaScript, o formulário vai direto pra rota e volta pra conversa.
 */
export function ReplyForm({ number, closed, token }: { number: number; closed: boolean; token?: string | undefined }) {
  const router = useRouter();
  const draftKey = `escalashop:ticket-draft:${number}`;
  const [draftState, setDraftState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const attachments = useAttachments();
  const form = useRef<HTMLFormElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // O rascunho guardado volta pro campo (sem passar por estado: o campo é do navegador).
  useEffect(() => {
    const saved = readDraft(draftKey);
    if (saved && field.current && !field.current.value) field.current.value = saved;
    return () => window.clearTimeout(timer.current);
  }, [draftKey]);

  function scheduleDraft() {
    setDraftState('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      writeDraft(draftKey, field.current?.value ?? '');
      setDraftState('saved');
    }, DRAFT_DELAY_MS);
  }

  function addQuick(text: string) {
    if (!field.current) return;
    const current = field.current.value.trim();
    field.current.value = current ? `${current} ${text}` : text;
    field.current.focus();
    scheduleDraft();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!field.current?.value.trim()) {
      setError('Escreva a mensagem antes de enviar.');
      return;
    }
    setSending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    data.set(ENHANCED_SUBMIT_FIELD, '1');
    appendAttachments(data, attachments.files);
    try {
      const response = await fetch(`/api/suporte/chamados/${number}/mensagens`, { method: 'POST', body: data });
      const result = (await response.json()) as { ok: boolean; message?: string; notice?: string | null };
      if (result.ok) {
        window.clearTimeout(timer.current);
        if (field.current) field.current.value = '';
        writeDraft(draftKey, '');
        setDraftState('idle');
        attachments.clear();
        // Enviada; os arquivos recusados aparecem com o motivo.
        if (result.notice) setError(`Mensagem enviada. ${result.notice}`);
        router.refresh();
      } else setError(`${result.message ?? 'Não foi possível enviar agora.'} O que você escreveu continua aqui.`);
    } catch {
      setError('Não foi possível enviar agora. O que você escreveu continua aqui.');
    }
    setSending(false);
  }

  return (
    <form
      ref={form}
      action={`/api/suporte/chamados/${number}/mensagens`}
      method="post"
      encType="multipart/form-data"
      onSubmit={submit}
      className="flex flex-col gap-3"
    >
      {token ? <input type="hidden" name="token" value={token} /> : null}
      <Label htmlFor="reply-body">Sua resposta</Label>
      {closed ? <p className="text-sm text-muted-foreground">Responder reabre o chamado.</p> : null}
      <Textarea
        ref={field}
        id="reply-body"
        name="mensagem"
        maxLength={MAX_DESCRIPTION}
        placeholder="Escreva sua resposta para o suporte…"
        onChange={scheduleDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) form.current?.requestSubmit();
        }}
        onPaste={(event) => {
          if (event.clipboardData.files.length) {
            event.preventDefault();
            void attachments.addFiles(event.clipboardData.files);
          }
        }}
        onDrop={(event) => {
          if (event.dataTransfer.files.length) {
            event.preventDefault();
            void attachments.addFiles(event.dataTransfer.files);
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_REPLIES.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => addQuick(text)}
            className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 text-sm font-semibold text-foreground outline-none hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-ring"
          >
            {text.replace('.', '')}
          </button>
        ))}
        <span aria-live="polite" className="ml-auto text-sm text-muted-foreground">
          {draftState === 'saving' ? 'Salvando rascunho…' : draftState === 'saved' ? 'Rascunho salvo' : ''}
        </span>
      </div>
      <AttachmentPicker attachments={attachments} />
      {error ? (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={sending} loadingText="Enviando…" className="sm:w-auto sm:self-end sm:px-8">
        <Send aria-hidden="true" />
        Enviar resposta
      </Button>
    </form>
  );
}

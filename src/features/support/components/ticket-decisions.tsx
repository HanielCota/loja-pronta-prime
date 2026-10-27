'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  closeTicketAction,
  emailRepliesAction,
  markMyTicketRead,
  notResolvedAction,
  rateAction,
  resolveTicketAction,
  undoCloseAction,
  type TicketActionState,
} from '../server/actions';

const IDLE: TicketActionState = { ok: false, message: '' };

function Hidden({ number, token }: { number: number; token?: string | undefined }) {
  return (
    <>
      <input type="hidden" name="numero" value={number} />
      {token ? <input type="hidden" name="token" value={token} /> : null}
    </>
  );
}

function Feedback({ state }: { state: TicketActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? 'status' : 'alert'} className={cn('text-body', state.ok ? 'text-progress-text' : 'text-destructive')}>
      {state.message}
    </p>
  );
}

/**
 * "Resolveu?" sob a última resposta do suporte. "Sim, resolveu" encerra e dá 5 segundos pra
 * desfazer; "Ainda não" responde na hora e devolve o chamado pra fila (não só preenche a caixa).
 */
export function ResolutionPrompt({ number, token }: { number: number; token?: string | undefined }) {
  const router = useRouter();
  const [undoLeft, setUndoLeft] = useState(0);
  // Encerrar abre os 5 segundos pra desfazer: o contador começa na própria ação, não num efeito.
  const [closed, closeAction, closing] = useActionState(async (state: TicketActionState, form: FormData) => {
    const result = await resolveTicketAction(state, form);
    if (result.ok) setUndoLeft(5);
    return result;
  }, IDLE);
  const [notResolved, notResolvedFormAction, sendingNo] = useActionState(notResolvedAction, IDLE);
  const [undoState, setUndoState] = useState<TicketActionState>(IDLE);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (undoLeft <= 0) {
      if (closed.ok) router.refresh();
      return;
    }
    const timer = window.setTimeout(() => setUndoLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [undoLeft, closed.ok, router]);

  useEffect(() => {
    if (notResolved.ok) router.refresh();
  }, [notResolved, router]);

  function undo() {
    const form = new FormData();
    form.set('numero', String(number));
    if (token) form.set('token', token);
    startTransition(async () => {
      const result = await undoCloseAction(IDLE, form);
      setUndoState(result);
      setUndoLeft(0);
      router.refresh();
    });
  }

  if (closed.ok && undoLeft > 0)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted px-4 py-3 text-body">
        <output>Chamado encerrado.</output>
        <Button type="button" variant="soft" size="inline" className="px-4" loading={pending} onClick={undo}>
          Desfazer ({undoLeft})
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted px-4 py-4">
      <p className="text-body font-semibold">Isso resolveu o seu problema?</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={closeAction}>
          <Hidden number={number} token={token} />
          <Button type="submit" variant="soft" className="sm:w-auto sm:px-6" loading={closing} loadingText="Encerrando…">
            Sim, resolveu
          </Button>
        </form>
        <form action={notResolvedFormAction}>
          <Hidden number={number} token={token} />
          <Button type="submit" variant="ghost" className="sm:w-auto sm:px-6" loading={sendingNo} loadingText="Avisando…">
            Ainda não
          </Button>
        </form>
      </div>
      <Feedback state={closed.ok ? IDLE : closed} />
      <Feedback state={notResolved} />
      <Feedback state={undoState} />
    </div>
  );
}

/** "Seu problema foi resolvido?" + "Encerrar chamado", pra quem não quer esperar a resposta. */
export function CloseTicketForm({ number, token }: { number: number; token?: string | undefined }) {
  const [state, action, pending] = useActionState(closeTicketAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <Hidden number={number} token={token} />
      <p className="text-body text-muted-foreground">Seu problema foi resolvido?</p>
      <Button type="submit" variant="ghost" className="w-fit px-4" size="inline" loading={pending}>
        Encerrar chamado
      </Button>
      <Feedback state={state} />
    </form>
  );
}

/** Avaliação de 1 a 5 com comentário opcional, uma vez por encerramento. */
export function RatingForm({ number, token }: { number: number; token?: string | undefined }) {
  const [state, action, pending] = useActionState(rateAction, IDLE);
  const [rating, setRating] = useState(0);
  if (state.ok) return <Feedback state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <Hidden number={number} token={token} />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-body font-semibold">Como foi o atendimento?</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-ring">
              <input type="radio" name="nota" value={value} required className="sr-only" onChange={() => setRating(value)} />
              <Star aria-hidden="true" className={cn('size-7', value <= rating ? 'fill-current text-link' : 'text-muted-foreground')} />
              <span className="sr-only">{value === 1 ? '1 estrela' : `${value} estrelas`}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rating-comment">Quer contar mais? (opcional)</Label>
        <Textarea id="rating-comment" name="comentario" maxLength={1000} className="min-h-20" />
      </div>
      <Feedback state={state} />
      <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6" loading={pending}>
        Enviar avaliação
      </Button>
    </form>
  );
}

/** "Receber respostas por e-mail": liga e desliga. */
export function EmailRepliesToggle({ number, enabled, token }: { number: number; enabled: boolean; token?: string | undefined }) {
  const [state, action, pending] = useActionState(emailRepliesAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-1">
      <Hidden number={number} token={token} />
      <input type="hidden" name="email" value={enabled ? '0' : '1'} />
      <Button type="submit" variant="link" size="inline" loading={pending} className="w-fit">
        {enabled ? 'Parar de receber as respostas por e-mail' : 'Receber as respostas por e-mail'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

/** Marca como lido quando a mensagem mais nova aparece na tela (não só ao abrir a página). */
export function MarkRead({ number, messageId, onRead = markMyTicketRead }: { number: number; messageId: string; onRead?: (number: number, messageId: string) => Promise<void> }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const target = document.getElementById(`mensagem-${messageId}`);
    if (!target || sent.current === messageId) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      sent.current = messageId;
      void onRead(number, messageId).catch(() => undefined);
      observer.disconnect();
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [number, messageId, onRead]);
  return null;
}

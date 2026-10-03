'use client';

import { CircleCheckIcon, MessageCircleIcon, SendIcon, TriangleAlertIcon } from 'lucide-react';
import {
  useActionState,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { celebrateMascot, nodMascot, upsetMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { submitWithoutReset } from '@/lib/forms';
import { cn } from '@/lib/utils';
import { finishConversation } from '../server/actions';
import { formatTypedWhatsapp, parseWhatsapp, typedWhatsapp, whatsappHint } from '../whatsapp';

/** Posição do cursor logo depois do n-ésimo número do texto formatado. */
function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return formatted.startsWith('(') ? 1 : 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted.charAt(index))) seen++;
    if (seen === count) return index + 1;
  }
  return formatted.length;
}

/**
 * Última etapa: o WhatsApp dos avisos de cada fase. Feito pra quem tem pouca prática:
 * - o +55 já vem no campo (ninguém digita o código do país);
 * - o número se organiza enquanto ela digita, "(11) 98765-4321", sem travar: aceita colar em
 *   qualquer formato, apagar no meio, e o cursor fica onde ela estava;
 * - embaixo, o exemplo e quanto falta, os enganos comuns (sem DDD, fixo, sem o 9, com 0) e, no
 *   fim, "Número completo" e o número grande pra ela conferir antes de enviar.
 * Só ajuda: quem confere é o servidor (parseWhatsapp). Sem JavaScript, o campo é um campo comum.
 */
export function WhatsappForm({ helpId }: { helpId: string }) {
  const [state, formAction, pending] = useActionState(finishConversation, undefined);
  const [value, setValue] = useState('');
  const [removed, setRemoved] = useState<'pais' | 'zero'>();
  const [clientError, setClientError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const errorId = useId();
  const hintId = useId();
  const error = clientError ?? state?.error;

  const { digits } = typedWhatsapp(value);
  const hint = whatsappHint(digits, removed);
  const complete = hint.tone === 'ok';

  useEffect(() => {
    if (state?.error) upsetMascot('worried');
  }, [state]);

  // Completou o número: o mascote concorda.
  useEffect(() => {
    if (complete) nodMascot();
  }, [complete]);

  // Depois de reformatar, o cursor volta pra perto de onde ela estava (a cada render: só age
  // quando há uma posição guardada pela última digitação).
  useLayoutEffect(() => {
    if (caretRef.current === null) return;
    inputRef.current?.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setClientError(undefined);
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    let before = raw.slice(0, caret).replace(/\D/g, '').length;
    const typed = typedWhatsapp(raw);
    let next = typed.digits;
    // Apagou só um símbolo (parêntese, espaço, traço): apaga o número antes dele, senão a
    // formatação poria o símbolo de volta e o apagar pareceria travado.
    if (raw.length < value.length && next === typedWhatsapp(value).digits && before > 0) {
      next = next.slice(0, before - 1) + next.slice(before);
      before -= 1;
    }
    const formatted = formatTypedWhatsapp(next);
    // Tirou o 55 ou o 0 da frente: o cursor vai pro fim (as posições mudaram).
    caretRef.current = typed.removed ? formatted.length : caretAfterDigits(formatted, before);
    setRemoved(typed.removed);
    setValue(formatted);
  }

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset((event) => {
        const typed = new FormData(event.currentTarget).get('whatsapp');
        if (!parseWhatsapp(String(typed ?? ''))) {
          event.preventDefault();
          setClientError('Confira o número com DDD, como (11) 98765-4321.');
          upsetMascot('worried');
          return;
        }
        celebrateMascot();
      }, formAction)}
      className="flex flex-col gap-3"
    >
      <FloatingLabelInput
        ref={inputRef}
        id="whatsapp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        label="Seu WhatsApp, com DDD"
        value={value}
        onChange={handleChange}
        aria-describedby={[helpId, hintId, error ? errorId : ''].join(' ').trim()}
        aria-invalid={error ? true : undefined}
        className="text-lg tracking-wide"
        startSlot={
          <span className="flex items-center gap-1.5 text-body font-semibold text-foreground">
            <BrazilFlag />
            +55
          </span>
        }
        endSlot={
          <span aria-hidden="true" className="grid size-11 place-items-center">
            {complete ? (
              <CircleCheckIcon className="size-6 text-green-700" />
            ) : (
              <MessageCircleIcon className="size-6 text-muted-foreground" />
            )}
          </span>
        }
      />

      <p
        id={hintId}
        className={cn(
          'flex items-start gap-1.5 px-1 text-sm',
          hint.tone === 'ok' && 'font-semibold text-green-700',
          hint.tone === 'warning' && 'text-warning',
          hint.tone === 'info' && 'text-muted-foreground',
        )}
      >
        {hint.tone === 'ok' ? (
          <CircleCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        ) : null}
        {hint.tone === 'warning' ? (
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        ) : null}
        {hint.text}
      </p>
      {/* Anuncia só o que importa (engano ou número completo), não cada número digitado. */}
      <p aria-live="polite" className="sr-only">
        {hint.tone === 'info' ? '' : hint.text}
      </p>

      <FieldError id={errorId}>{error}</FieldError>

      {complete ? (
        <p className="mt-2 rounded-2xl bg-card px-4 py-3 text-center text-body text-pretty shadow-sm">
          Vamos avisar você no <strong className="font-semibold whitespace-nowrap">{value}</strong>
        </p>
      ) : null}

      <Button type="submit" loading={pending} loadingText="Enviando…" className="mt-2">
        Enviar respostas
        {pending ? null : <SendIcon aria-hidden="true" />}
      </Button>
    </form>
  );
}

/** Bandeira do Brasil desenhada (no Windows, o emoji de bandeira vira só "BR"). */
function BrazilFlag() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 14" className="h-3.5 w-5 rounded-[2px]">
      <rect width="20" height="14" fill="#009c3b" />
      <path d="M10 1.6 18.2 7 10 12.4 1.8 7z" fill="#ffdf00" />
      <circle cx="10" cy="7" r="3" fill="#002776" />
    </svg>
  );
}

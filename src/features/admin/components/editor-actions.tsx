'use client';

import { useActionState, useEffect, useRef, useState, type RefObject } from 'react';
import { LiveRegion } from '@/components/ui/live-region';
import { cn } from '@/lib/utils';
import { intentReloadsForm } from '../editor-intent';
import type { EditorActionState } from '../structure-types';

export type EditorMessage = { text: string; error: boolean; focus: boolean };

const initialState: EditorActionState = { message: '', saved: false };
const noMessage: EditorMessage = { text: '', error: false, focus: false };

/**
 * Estado dos botões abaixo dos editores do SLL (publicar, descartar, voltar, mover, arquivar).
 * `revision` muda quando os valores salvos mudam: use-a na chave do formulário para ele
 * recarregar com eles. Quando o botão usado some da tela (publicar, arquivar...), o foco vai
 * para a mensagem com o resultado, em vez de cair no início da página.
 */
export function useEditorActions(
  action: (previous: EditorActionState, form: FormData) => Promise<EditorActionState>,
) {
  const [state, run, pending] = useActionState(action, initialState);
  const [seenState, setSeenState] = useState(state);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState<EditorMessage>(noMessage);
  // Cada resposta é um objeto novo, mesmo com o mesmo texto: comparar a referência pega também
  // a segunda publicação seguida (um efeito em `state.saved` não rodaria de novo).
  if (seenState !== state) {
    setSeenState(state);
    const reloads = state.saved && intentReloadsForm(state.intent);
    setMessage({
      text: state.message,
      error: !state.saved,
      focus: reloads || (state.saved && state.intent === 'archive'),
    });
    if (reloads) setRevision((value) => value + 1);
  }
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message.focus) messageRef.current?.focus();
  }, [message]);
  return { run, pending, revision, message, setMessage, messageRef };
}

/**
 * Mostra o resultado na tela e no leitor de tela. A região de anúncio fica sempre montada;
 * quando o foco vai para a mensagem, ela já é lida ali e não é anunciada duas vezes.
 */
export function EditorActionMessage({
  message,
  messageRef,
  className,
}: {
  message: EditorMessage;
  messageRef: RefObject<HTMLParagraphElement | null>;
  className?: string;
}) {
  return (
    <>
      {message.text ? (
        <p
          className={cn(
            'rounded-xl text-body outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            message.error ? 'text-destructive' : 'text-foreground',
            className,
          )}
          ref={messageRef}
          tabIndex={-1}
        >
          {message.text}
        </p>
      ) : null}
      <LiveRegion>{message.focus ? null : message.text}</LiveRegion>
    </>
  );
}

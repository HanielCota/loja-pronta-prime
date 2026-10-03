'use client';

import { SendIcon } from 'lucide-react';
import { useActionState, useEffect, useId, useState } from 'react';
import { celebrateMascot, upsetMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { submitWithoutReset } from '@/features/auth/enhanced-submit';
import { finishConversation } from '../server/actions';
import { parseWhatsapp } from '../steps';

/**
 * Última etapa: o WhatsApp em que a equipe avisa de cada fase. Sem máscara no campo (máscaras
 * atrapalham quem cola o número ou usa leitor de tela): aceita qualquer formato e o servidor
 * guarda só os dígitos.
 */
export function WhatsappForm({ helpId }: { helpId: string }) {
  const [state, formAction, pending] = useActionState(finishConversation, undefined);
  const [clientError, setClientError] = useState<string>();
  const errorId = useId();
  const error = clientError ?? state?.error;

  useEffect(() => {
    if (state?.error) upsetMascot('worried');
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset((event) => {
        const value = new FormData(event.currentTarget).get('whatsapp');
        if (!parseWhatsapp(String(value ?? ''))) {
          event.preventDefault();
          setClientError('Confira o número com DDD, como (11) 98765-4321.');
          upsetMascot('worried');
          return;
        }
        celebrateMascot();
      }, formAction)}
      className="flex flex-col gap-5"
    >
      <FloatingLabelInput
        id="whatsapp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        label="Seu WhatsApp, com DDD"
        onChange={() => setClientError(undefined)}
        aria-describedby={[helpId, error ? errorId : ''].join(' ').trim()}
        aria-invalid={error ? true : undefined}
      />
      <FieldError id={errorId}>{error}</FieldError>
      <Button type="submit" loading={pending} loadingText="Enviando…">
        Enviar respostas
        {pending ? null : <SendIcon aria-hidden="true" />}
      </Button>
    </form>
  );
}

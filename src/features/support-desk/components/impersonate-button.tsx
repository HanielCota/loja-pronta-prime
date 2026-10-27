'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startVisit, startVisitForm } from '../server/visit-actions';

type ImpersonateButtonProps = {
  userId: string;
  name: string;
  /** De onde a visita parte (volta pra cá se o servidor recusar sem JavaScript). */
  back: string;
  /** O chamado que motivou a visita, pro registro. */
  ticketNumber?: number;
  /** Página da área da aluna onde a visita começa (o servidor confere). */
  destination?: string;
  /** Por que não dá pra entrar; com motivo, o botão fica desligado e explica. */
  refusal?: string | null;
};

/**
 * "Entrar como aluna", com confirmação: a visita dura 1 hora e fica registrada. Depois de entrar,
 * a página carrega inteira (a troca de sessão precisa de um documento novo). Sem JavaScript, o
 * formulário funciona do mesmo jeito pelo servidor.
 */
export function ImpersonateButton({
  userId,
  name,
  back,
  ticketNumber,
  destination,
  refusal,
}: ImpersonateButtonProps) {
  const reasonId = useId();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  if (refusal)
    return (
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="soft"
          className="w-fit px-5"
          size="inline"
          disabled
          aria-describedby={reasonId}
        >
          <Eye aria-hidden="true" />
          Entrar como aluna
        </Button>
        <p id={reasonId} className="text-body text-muted-foreground">
          {refusal}
        </p>
      </div>
    );

  if (!confirming)
    return (
      <Button
        type="button"
        variant="soft"
        className="w-fit px-5"
        size="inline"
        onClick={() => setConfirming(true)}
      >
        <Eye aria-hidden="true" />
        Entrar como aluna
      </Button>
    );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('');
    startTransition(async () => {
      const result = await startVisit(form);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      window.location.assign(result.redirectTo);
    });
  }

  return (
    <form
      action={startVisitForm}
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl bg-muted p-4"
    >
      <input type="hidden" name="aluna" value={userId} />
      <input type="hidden" name="voltar" value={back} />
      {ticketNumber ? <input type="hidden" name="numero" value={ticketNumber} /> : null}
      {destination ? <input type="hidden" name="destino" value={destination} /> : null}
      <p className="text-body">
        Você vai usar a conta de {name} por 1 hora. Tudo o que fizer fica registrado com o seu nome.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="soft" className="w-fit px-5" size="inline" loading={pending}>
          Entrar
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-fit px-4"
          size="inline"
          onClick={() => setConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
      {message ? (
        <p role="alert" className="text-body text-destructive">
          {message}
        </p>
      ) : null}
    </form>
  );
}

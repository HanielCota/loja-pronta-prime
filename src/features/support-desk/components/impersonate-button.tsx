'use client';

import { useId, useRef, useState, useTransition, type FormEvent } from 'react';
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
 * "Entrar como aluna", com confirmação: a visita dura 1 hora e fica registrada. A confirmação é um
 * `<details>`, então abre e fecha sem JavaScript e o foco fica no botão. Depois de entrar, a página
 * carrega inteira (a troca de sessão precisa de um documento novo).
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
  const details = useRef<HTMLDetailsElement>(null);
  const [message, setMessage] = useState('');
  // Fica carregando até a página nova abrir: um segundo clique sairia já com a sessão da aluna.
  const [leaving, setLeaving] = useState(false);
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('');
    startTransition(async () => {
      try {
        const result = await startVisit(form);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setLeaving(true);
        window.location.assign(result.redirectTo);
      } catch {
        setMessage('Não foi possível entrar na conta agora. Tente de novo.');
      }
    });
  }

  function cancel() {
    if (!details.current) return;
    details.current.open = false;
    details.current.querySelector('summary')?.focus();
  }

  return (
    <details ref={details}>
      <Button
        asChild
        variant="soft"
        className="w-fit cursor-pointer list-none px-5 [&::-webkit-details-marker]:hidden"
        size="inline"
      >
        <summary>
          <Eye aria-hidden="true" />
          Entrar como aluna
        </summary>
      </Button>
      <form
        action={startVisitForm}
        onSubmit={submit}
        className="mt-3 flex flex-col gap-3 rounded-2xl bg-muted p-4"
      >
        <input type="hidden" name="aluna" value={userId} />
        <input type="hidden" name="voltar" value={back} />
        {ticketNumber ? <input type="hidden" name="numero" value={ticketNumber} /> : null}
        {destination ? <input type="hidden" name="destino" value={destination} /> : null}
        <p className="text-body">
          Você vai usar a conta de {name} por 1 hora. Tudo o que fizer fica registrado com o seu
          nome.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            variant="soft"
            className="w-fit px-5"
            size="inline"
            loading={pending || leaving}
          >
            Entrar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-fit px-4"
            size="inline"
            onClick={cancel}
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
    </details>
  );
}

'use client';

import { useActionState, useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startVisitAction, type DeskActionState } from '../server/actions';

const IDLE: DeskActionState = { ok: false, message: '' };

/** "Entrar como aluna", com confirmação: a visita dura 1 hora e fica registrada. */
export function ImpersonateButton({ userId, ticketNumber, name }: { userId: string; ticketNumber: number; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(startVisitAction, IDLE);
  if (!confirming)
    return (
      <Button type="button" variant="soft" className="w-fit px-5" size="inline" onClick={() => setConfirming(true)}>
        <Eye aria-hidden="true" />
        Entrar como aluna
      </Button>
    );
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
      <input type="hidden" name="aluna" value={userId} />
      <input type="hidden" name="numero" value={ticketNumber} />
      <p className="text-body">Você vai ver a plataforma como {name} por 1 hora. Tudo fica registrado.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="soft" className="w-fit px-5" size="inline" loading={pending}>
          Entrar
        </Button>
        <Button type="button" variant="ghost" className="w-fit px-4" size="inline" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

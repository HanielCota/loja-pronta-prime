'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { leaveVisit, leaveVisitForm } from '@/features/support-desk/server/visit-actions';
import { STAFF_HOME } from '../visit-window';

/**
 * "Voltar ao painel": encerra a visita e recarrega a página inteira no painel do suporte. Se a
 * sessão da equipe não voltou, vai pro login. Sem JavaScript, o formulário faz o mesmo pelo
 * servidor.
 */
export function LeaveVisitButton({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  // Fica carregando até a página nova abrir, pra não mandar a saída duas vezes.
  const [leaving, setLeaving] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(false);
    startTransition(async () => {
      try {
        const { end } = await leaveVisit();
        setLeaving(true);
        window.location.assign(end === 'returned' ? STAFF_HOME : '/entrar');
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <form action={leaveVisitForm} onSubmit={submit} className="flex flex-col items-center gap-2">
      <Button type="submit" size="inline" className={className} loading={pending || leaving}>
        Voltar ao painel
      </Button>
      {failed ? (
        <p role="alert" className="text-body">
          Não foi possível voltar agora. Tente de novo.
        </p>
      ) : null}
    </form>
  );
}

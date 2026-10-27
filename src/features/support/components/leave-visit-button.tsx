'use client';

import { useTransition, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { leaveVisit, leaveVisitForm } from '@/features/support-desk/server/visit-actions';

/** Pra onde a equipe volta; a página carrega inteira pra não sobrar nada da sessão da aluna. */
const STAFF_HOME = '/admin/chamados';

/**
 * "Voltar ao painel": encerra a visita e recarrega a página inteira no painel do suporte. Sem
 * JavaScript, o formulário faz o mesmo pelo servidor.
 */
export function LeaveVisitButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await leaveVisit();
      // Sem visita pra encerrar, a sessão já acabou: o login pede a senha de novo.
      window.location.assign(result.ok ? STAFF_HOME : '/entrar');
    });
  }

  return (
    <form action={leaveVisitForm} onSubmit={submit}>
      <Button type="submit" size="inline" className={className} loading={pending}>
        Voltar ao painel
      </Button>
    </form>
  );
}

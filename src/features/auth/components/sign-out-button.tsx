'use client';

import { LogOutIcon } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from '../server/sign-out';

/**
 * Formulário de verdade: sair funciona mesmo sem JavaScript. Em cinza, abaixo do conteúdo: está
 * sempre à mão, mas não disputa atenção com a ação principal da tela.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut} className={cn('flex justify-center', className)}>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="link"
      size="inline"
      loading={pending}
      loadingText="Saindo…"
      className="group gap-2.5 pr-1 font-semibold text-muted-foreground hover:text-foreground hover:no-underline"
    >
      {/* Mesmo desenho do voltar (ícone num círculo), mas em cinza e sem fundo: dá pra achar, mas
          fica um degrau abaixo, porque sair sem querer custa digitar a senha de novo. */}
      <span className="flex size-9 items-center justify-center rounded-full border border-border transition-colors duration-150 group-hover:border-input group-hover:bg-card forced-colors:border-[ButtonText]">
        <LogOutIcon aria-hidden="true" className="size-4" />
      </span>
      <span className="underline-offset-4 group-hover:underline">Sair da conta</span>
    </Button>
  );
}

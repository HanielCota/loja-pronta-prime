'use client';

import { LogOutIcon } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { listCard } from '@/features/member/list-card';
import { cn } from '@/lib/utils';
import { signOutOtherDevices } from '../server/profile';
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

/**
 * O sair no fim do perfil, como nos Ajustes do iPhone: uma linha sozinha, em vermelho, separada do
 * resto pra ninguém tocar sem querer.
 */
export function SignOutRow() {
  return (
    <form action={signOut} className={listCard}>
      <SignOutRowButton />
    </form>
  );
}

function SignOutRowButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      loading={pending}
      loadingText="Saindo…"
      className="rounded-none font-semibold text-destructive hover:bg-muted hover:text-destructive focus-visible:-outline-offset-2"
    >
      Sair da conta
    </Button>
  );
}

/**
 * "Sair dos outros aparelhos", no fim da lista de aparelhos: mesmo desenho de linha do sair, mas
 * no azul de ação, porque não tira ela daqui (só os outros aparelhos pedem a senha de novo).
 */
export function SignOutOthersRow() {
  return (
    <li>
      <form action={signOutOtherDevices}>
        <SignOutOthersButton />
      </form>
    </li>
  );
}

function SignOutOthersButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      loading={pending}
      loadingText="Saindo dos outros aparelhos…"
      className="w-full rounded-none font-semibold text-link hover:bg-muted focus-visible:-outline-offset-2"
    >
      <LogOutIcon aria-hidden="true" />
      Sair dos outros aparelhos
    </Button>
  );
}

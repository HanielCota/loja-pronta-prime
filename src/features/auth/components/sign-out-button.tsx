'use client';

import { LogOutIcon } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { signOut } from '../server/sign-out';

/** Formulário de verdade: sair funciona mesmo sem JavaScript. */
export function SignOutButton() {
  return (
    <form action={signOut} className="flex justify-center">
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="link" size="inline" loading={pending} loadingText="Saindo…">
      <LogOutIcon aria-hidden="true" className="size-4" />
      Sair da conta
    </Button>
  );
}

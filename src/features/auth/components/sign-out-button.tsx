'use client';

import { LogOutIcon } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from '../server/sign-out';

/** Formulário de verdade: sair funciona mesmo sem JavaScript. */
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
    <Button type="submit" variant="link" size="inline" loading={pending} loadingText="Saindo…">
      <LogOutIcon aria-hidden="true" className="size-4" />
      Sair da conta
    </Button>
  );
}

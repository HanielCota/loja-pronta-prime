'use client';

import { createContext, useActionState, useContext, useEffect, useId, type ReactNode } from 'react';
import { upsetMascot } from '@/components/brand/mascot';
import { FieldError } from '@/components/ui/field';
import { submitWithoutReset } from '@/lib/forms';
import { cn } from '@/lib/utils';
import type { BrandResult } from '../server/actions';

const PendingContext = createContext(false);

/** O formulário está salvando (os botões dele ficam esperando). */
export function useBrandPending(): boolean {
  return useContext(PendingContext);
}

type BrandFormProps = {
  action: (state: BrandResult, formData: FormData) => Promise<BrandResult>;
  /** Veio da revisão pra mudar algo: salvar volta pra ela. */
  editing?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Formulário de um passo da marca: Server Action de verdade (funciona sem JavaScript), sem apagar
 * o que ela digitou quando volta um erro, e o erro aparece embaixo, anunciado.
 */
export function BrandForm({ action, editing = false, className, children }: BrandFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errorId = useId();

  useEffect(() => {
    if (state?.error) upsetMascot('worried');
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset(() => {}, formAction)}
      aria-describedby={state?.error ? errorId : undefined}
      className={cn('flex flex-col gap-3', className)}
    >
      {editing ? <input type="hidden" name="editing" value="1" /> : null}
      <PendingContext value={pending}>{children}</PendingContext>
      {/* Sempre no código (vazio, fora do fluxo): assim o "Salvando…" é anunciado. */}
      <p aria-live="polite" className="text-sm text-muted-foreground empty:sr-only">
        {pending ? 'Salvando…' : ''}
      </p>
      <FieldError id={errorId}>{state?.error}</FieldError>
    </form>
  );
}

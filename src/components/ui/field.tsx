import * as React from 'react';
import { cn } from '@/lib/utils';

/** Agrupa um campo de formulário e suas mensagens. */
function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="field" className={cn('flex w-full flex-col gap-1.5', className)} {...props} />
  );
}

/** Mensagem de erro do campo, anunciada por leitores de tela assim que aparece. */
function FieldError({ className, children, ...props }: React.ComponentProps<'div'>) {
  if (!children) return null;

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('flex items-start gap-1.5 px-1 text-sm text-destructive', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Field, FieldError };

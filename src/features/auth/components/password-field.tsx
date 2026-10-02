'use client';

import { getInputProps, type FieldMetadata } from '@conform-to/react';
import type { ReactNode } from 'react';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { FieldErrorMessage } from './field-error-message';

type PasswordFieldProps = {
  meta: FieldMetadata<string>;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  /** Dica curta embaixo do campo (lida pelo leitor de tela junto com o campo). */
  hint?: string;
  /** Conteúdo logo abaixo do campo, ex.: link "Esqueci minha senha". */
  below?: ReactNode;
};

export function PasswordField({ meta, label, autoComplete, hint, below }: PasswordFieldProps) {
  const { key, type: _type, ...inputProps } = getInputProps(meta, { type: 'password' });
  const hintId = `${meta.id}-dica`;
  // Junta a dica com a mensagem de erro (quando houver) que o Conform já liga ao campo.
  const describedBy =
    [hint ? hintId : undefined, inputProps['aria-describedby']].filter(Boolean).join(' ') ||
    undefined;

  return (
    <Field>
      <PasswordInput
        key={key}
        {...inputProps}
        id={meta.id}
        label={label}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
      />
      {hint ? (
        <p id={hintId} className="px-1 text-sm text-pretty text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <FieldErrorMessage id={meta.errorId} errors={meta.errors} />
      {below}
    </Field>
  );
}

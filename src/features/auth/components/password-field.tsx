'use client';

import { getInputProps, type FieldMetadata } from '@conform-to/react';
import { KeyRoundIcon } from 'lucide-react';
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
  /** Colado no campo, antes da dica: ex.: a força da senha enquanto ela é criada. */
  meter?: ReactNode;
  /** Conteúdo logo abaixo do campo, ex.: link "Esqueci minha senha". */
  below?: ReactNode;
};

export function PasswordField({
  meta,
  label,
  autoComplete,
  hint,
  meter,
  below,
}: PasswordFieldProps) {
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
      {meter}
      {hint ? (
        <p
          id={hintId}
          className="flex items-start gap-1.5 px-1 text-sm text-pretty text-muted-foreground"
        >
          <KeyRoundIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {hint}
        </p>
      ) : null}
      <FieldErrorMessage id={meta.errorId} errors={meta.errors} />
      {below}
    </Field>
  );
}

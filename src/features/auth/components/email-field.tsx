'use client';

import { getInputProps, type FieldMetadata } from '@conform-to/react';
import { useEffect, useRef, useState, type InputEvent } from 'react';
import { nodMascot, setMascotDoubt } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { suggestEmail } from '../email-suggestion';
import { emailSchema } from '../schemas';
import { FieldErrorMessage } from './field-error-message';

type EmailFieldProps = {
  meta: FieldMetadata<string>;
  onSuggestionAccept: (email: string) => void;
};

export function EmailField({ meta, onSuggestionAccept }: EmailFieldProps) {
  const [focused, setFocused] = useState(false);
  const { key, ...inputProps } = getInputProps(meta, { type: 'email' });
  const suggestion = focused || meta.errors ? undefined : suggestEmail(meta.value ?? '');
  const wasComplete = useRef(false);

  // O mascote fica desconfiado enquanto a sugestão está na tela.
  useEffect(() => {
    if (!suggestion) return;
    setMascotDoubt(true);
    return () => setMascotDoubt(false);
  }, [suggestion]);

  // Aceno quando o email fica completo (a mesma regra da validação), uma vez a cada vez.
  function onInput(event: InputEvent<HTMLInputElement>) {
    const complete = emailSchema.safeParse(event.currentTarget.value).success;
    if (complete && !wasComplete.current) nodMascot();
    wasComplete.current = complete;
  }

  return (
    <Field>
      <FloatingLabelInput
        key={key}
        {...inputProps}
        id={meta.id}
        label="Email da compra"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={onInput}
      />
      <FieldErrorMessage id={meta.errorId} errors={meta.errors} />
      {/* Região sempre presente: o leitor de tela anuncia a sugestão quando ela aparece. */}
      <div aria-live="polite" className="empty:hidden">
        {suggestion ? (
          <Button
            type="button"
            variant="link"
            size="inline"
            className="justify-start px-1 text-left text-sm font-normal whitespace-normal"
            onClick={() => onSuggestionAccept(suggestion)}
          >
            <span>
              Você quis dizer <strong className="font-semibold break-all">{suggestion}</strong>?
            </span>
          </Button>
        ) : null}
      </div>
    </Field>
  );
}

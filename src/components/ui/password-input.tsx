'use client';

import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, type ComponentProps, type KeyboardEvent } from 'react';
import { Button } from './button';
import { FloatingLabelInput } from './floating-label-input';

type PasswordInputProps = Omit<ComponentProps<typeof FloatingLabelInput>, 'type' | 'endSlot'>;

/** Campo de senha com botão de mostrar/esconder e aviso de Caps Lock. */
function PasswordInput({ onKeyDown, onKeyUp, onBlur, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  function detectCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState('CapsLock'));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FloatingLabelInput
        {...props}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={(event) => {
          detectCapsLock(event);
          onKeyDown?.(event);
        }}
        onKeyUp={(event) => {
          detectCapsLock(event);
          onKeyUp?.(event);
        }}
        onBlur={(event) => {
          setCapsLockOn(false);
          onBlur?.(event);
        }}
        endSlot={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Mostrar senha"
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        }
      />
      <p aria-live="polite" className="px-1 text-sm font-medium text-warning empty:hidden">
        {capsLockOn ? 'Caps Lock tá ativado.' : null}
      </p>
    </div>
  );
}

export { PasswordInput };

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * O teclado e o corretor certos pra cada tipo de campo, por padrão: email e endereço sem letra
 * maiúscula automática nem corretor (o celular "corrige" o email e ele para de funcionar), busca
 * com a tecla "Buscar" no teclado do celular, número com o teclado numérico. Quem usa o campo
 * ainda pode trocar qualquer um destes passando o atributo.
 */
const TYPE_DEFAULTS: Partial<Record<string, React.ComponentProps<'input'>>> = {
  email: { inputMode: 'email', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false },
  url: { inputMode: 'url', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false },
  password: { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false },
  tel: { inputMode: 'tel' },
  search: { enterKeyHint: 'search', autoComplete: 'off', spellCheck: false },
  number: { inputMode: 'numeric' },
};

// Texto de 17px: abaixo de 16px o iPhone dá zoom ao focar o campo.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      {...(type ? TYPE_DEFAULTS[type] : undefined)}
      data-slot="input"
      className={cn(
        // appearance-none: tira a sombra interna e os cantos que o Safari do iPhone aplica.
        'h-14 w-full min-w-0 appearance-none rounded-field border border-input bg-card px-4 text-body text-foreground transition-[border-color,box-shadow] duration-150 outline-none',
        // Foco: borda de 2px (borda + anel de 1px colado), bem visível e sem mexer no tamanho.
        'focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive',
        'motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}

export { Input };

import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Label } from './label';

type FloatingLabelInputProps = Omit<ComponentProps<'input'>, 'placeholder'> & {
  id: string;
  label: string;
  /** Ação dentro do campo, à direita (ex.: mostrar senha). */
  endSlot?: ReactNode;
};

/**
 * Campo com rótulo dentro, que sobe e diminui ao focar ou preencher (estilo Apple ID).
 * O rótulo continua sendo um <label> de verdade; só o movimento usa transform.
 */
function FloatingLabelInput({ id, label, endSlot, className, ...props }: FloatingLabelInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        // Placeholder vazio: é ele que diz ao CSS se o campo está preenchido.
        placeholder=" "
        className={cn('peer pt-6 pb-2', endSlot ? 'pr-14' : undefined, className)}
        {...props}
      />
      <Label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute top-4 left-4 origin-top-left text-body leading-6 font-normal text-muted-foreground',
          'transition-transform duration-200 ease-out motion-reduce:transition-none',
          // Rótulo flutuando: ao focar, quando preenchido e quando o navegador preenche sozinho.
          'peer-focus:-translate-y-2.5 peer-focus:scale-75',
          'peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75',
          'peer-autofill:-translate-y-2.5 peer-autofill:scale-75',
          'peer-aria-invalid:text-destructive',
        )}
      >
        {label}
      </Label>
      {endSlot ? <div className="absolute top-1.5 right-1.5">{endSlot}</div> : null}
    </div>
  );
}

export { FloatingLabelInput };

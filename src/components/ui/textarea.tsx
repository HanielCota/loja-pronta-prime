import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Texto de várias linhas com a cara dos campos do app (mesma borda, cantos, fundo e foco do
 * `Input`). Cresce sozinho com o texto onde o navegador sabe (`field-sizing`), sem o puxador do
 * canto; nos outros, o puxador continua, só na vertical, pra dar pra aumentar.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content min-h-28 w-full min-w-0 resize-y rounded-field border border-input bg-card px-4 py-3.5 text-body leading-relaxed text-foreground transition-[border-color,box-shadow] duration-150 ease-fluid outline-none',
        'supports-[field-sizing:content]:resize-none',
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

export { Textarea };

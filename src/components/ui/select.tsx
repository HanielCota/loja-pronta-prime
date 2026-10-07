import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lista de escolha com a cara dos campos do app (mesma borda, cantos, fundo e foco do `Input`) e a
 * seta do lucide no lugar da do navegador. Continua sendo o `<select>` nativo: a lista que abre é
 * a do aparelho (no celular, a roda de opções), funciona sem JavaScript e com leitor de tela.
 */
function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          // appearance-none tira a seta e o fundo cinza do navegador; o espaço à direita é da seta.
          'h-14 w-full min-w-0 cursor-pointer appearance-none rounded-field border border-input bg-card pr-12 pl-4 text-body text-foreground transition-[border-color,box-shadow] duration-150 ease-fluid outline-none',
          'focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive',
          'motion-reduce:transition-none',
          // Alto contraste do Windows: volta a seta do sistema (a do lucide some com as cores).
          'forced-colors:appearance-auto forced-colors:pr-4',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground forced-colors:hidden"
      />
    </div>
  );
}

export { Select };

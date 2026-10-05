import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * O quadro do estúdio: o logo grande (o rascunho enquanto ela escolhe; o logo pronto depois),
 * com uma linha embaixo dizendo o que é. No computador fica ao lado das escolhas, parado na tela
 * enquanto ela rola; no celular, em cima, menor, e (`sticky`) preso no topo pra ela ver o
 * rascunho mudar enquanto toca nas opções lá embaixo.
 */
export function StudioBoard({
  tag,
  caption,
  sticky,
  working = false,
  children,
}: {
  /** A etiqueta antes da linha ("Rascunho", "Logo 2"). */
  tag: string;
  caption: string;
  sticky: boolean;
  /** A IA está desenhando: um brilho passa por cima do rascunho. */
  working?: boolean;
  children: ReactNode;
}) {
  return (
    <figure
      className={cn(
        'm-0 flex flex-col gap-3 rounded-card bg-card p-4 shadow-card sm:p-5 lg:sticky lg:top-6 forced-colors:border forced-colors:border-[CanvasText]',
        sticky &&
          'max-lg:sticky max-lg:top-0 max-lg:z-10 max-lg:-mx-4 max-lg:gap-2 max-lg:rounded-t-none max-lg:p-3 sm:max-lg:-mx-6',
      )}
    >
      <div
        className={cn(
          'relative mx-auto aspect-square w-full overflow-hidden rounded-3xl border border-border',
          sticky ? 'max-w-44 sm:max-w-56 lg:max-w-none' : 'max-w-80 lg:max-w-none',
        )}
      >
        {children}
        {working ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-pulse bg-card/40 backdrop-blur-[2px] motion-reduce:animate-none"
          />
        ) : null}
      </div>
      <figcaption className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {tag}
        </span>
        {/* Preso no topo do celular, só a etiqueta: a frase tomaria a tela das opções. */}
        <span className={cn('text-pretty', sticky && 'max-lg:sr-only')}>{caption}</span>
      </figcaption>
    </figure>
  );
}

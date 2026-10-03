import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * O botão principal da etapa. No celular, fica preso embaixo da tela: sempre à mão, mesmo com
 * muitas opções ou respostas pra rolar. A partir do tablet, volta pro fluxo normal.
 */
export function StickyAction({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-4 bg-background/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Página centralizada (telas de acesso, 404, erro): no celular encosta no topo. `wide` abre
 * espaço pra blocos lado a lado (como a escolha de área).
 */
export function PageShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 sm:justify-center sm:py-16 short:py-3">
      <main
        className={cn(
          'flex w-full max-w-[480px] flex-col gap-6',
          wide ? 'sm:max-w-[720px] lg:max-w-[880px]' : 'lg:max-w-[640px]',
        )}
      >
        {children}
      </main>
    </div>
  );
}

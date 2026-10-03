import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SiteNavbar } from './site-navbar';

type PageShellProps = {
  children: ReactNode;
  /** Abre espaço pra blocos lado a lado (como a escolha de área). */
  wide?: boolean;
  /** A barra do topo; sem ela, a de quem não entrou (só a marca). */
  navbar?: ReactNode;
};

/**
 * Página centralizada (telas de acesso, 404, erro): a barra do topo, e o conteúdo no meio do
 * espaço que sobra. No celular, o conteúdo encosta no topo.
 */
export function PageShell({ children, wide, navbar = <SiteNavbar /> }: PageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      {navbar}
      <div className="flex flex-1 flex-col items-center px-4 py-8 sm:justify-center sm:py-16 short:py-3">
        <main
          className={cn(
            'flex w-full max-w-[480px] flex-col gap-6',
            wide ? 'sm:max-w-[720px] lg:max-w-[880px]' : 'lg:max-w-[640px]',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

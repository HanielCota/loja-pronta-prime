import type { ReactNode } from 'react';

/** Página centralizada (telas de acesso, 404, erro): no celular encosta no topo. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 sm:justify-center sm:py-16">
      <main className="flex w-full max-w-[480px] flex-col gap-6 lg:max-w-[640px]">{children}</main>
    </div>
  );
}

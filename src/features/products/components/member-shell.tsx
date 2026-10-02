import type { ReactNode } from 'react';
import { MemberHeader, type MemberHeaderProps } from './member-header';

type MemberShellProps = {
  /** Sem barra, a página mostra só o cartão (como na escolha de área). */
  header?: MemberHeaderProps;
  children: ReactNode;
};

/** Página da área da aluna: barra do topo (opcional) e, abaixo, o cartão centralizado. */
export function MemberShell({ header, children }: MemberShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      {header ? <MemberHeader {...header} /> : null}
      <div className="flex flex-1 flex-col items-center px-4 py-6 sm:py-12 short:py-3">
        <main className="flex w-full max-w-[480px] flex-col gap-6 lg:max-w-[640px]">
          {children}
        </main>
      </div>
    </div>
  );
}

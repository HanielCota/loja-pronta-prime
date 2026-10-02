'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type AuthStatusProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
};

/**
 * Resultado de uma ação (ex.: link enviado, senha salva). O título recebe o foco
 * pra leitores de tela anunciarem a mudança de tela.
 */
export function AuthStatus({ icon, title, children }: AuthStatusProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mb-8 flex flex-col items-center gap-3 text-center short:mb-4">
      <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-7">
        {icon}
      </span>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-title font-semibold text-balance outline-none sm:text-title-lg short:text-title"
      >
        {title}
      </h1>
      <div className="text-body text-pretty text-muted-foreground">{children}</div>
    </div>
  );
}

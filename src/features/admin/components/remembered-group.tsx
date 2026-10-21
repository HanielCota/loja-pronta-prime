'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronDownIcon } from 'lucide-react';

/**
 * Grupo do menu que abre e fecha (um <details>, funciona sem JavaScript) e lembra a escolha no
 * aparelho. Abre sozinho quando a página atual é dele, pra o item marcado nunca ficar escondido.
 */
export function RememberedGroup({
  storageKey,
  label,
  containsCurrent,
  children,
}: {
  storageKey: string;
  label: string;
  containsCurrent: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  // Depois de hidratar, volta à última escolha guardada (o servidor não conhece o aparelho).
  useEffect(() => {
    if (containsCurrent || !ref.current) return;
    try {
      if (localStorage.getItem(storageKey) === 'open') ref.current.open = true;
    } catch {
      // Sem acesso ao armazenamento (modo privado): fica como veio.
    }
  }, [containsCurrent, storageKey]);

  return (
    <details
      ref={ref}
      className="group/menu"
      open={containsCurrent || undefined}
      onToggle={(event) => {
        try {
          localStorage.setItem(storageKey, event.currentTarget.open ? 'open' : 'closed');
        } catch {
          // Idem: lembrar é só um conforto.
        }
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-2xl px-3 text-sm font-semibold text-muted-foreground outline-none group-open/menu:mb-2 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {label}
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 group-open/menu:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
        />
      </summary>
      {children}
    </details>
  );
}

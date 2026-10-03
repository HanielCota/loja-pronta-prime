'use client';

import { XIcon } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Janela do editor (pré-visualizar, ajuda): o `<dialog>` nativo do navegador, que prende o foco
 * dentro dela e fecha com Esc, com o título e o "Fechar" no topo.
 */
export function EditorDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(720px,calc(100vw-32px))] rounded-card bg-card p-0 text-foreground shadow-card backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <h2 id={titleId} className="flex-1 text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-11 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            <XIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}

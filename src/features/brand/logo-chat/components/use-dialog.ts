'use client';

import { useEffect, useRef } from 'react';

/**
 * Abre e fecha um <dialog> nativo como janela (prende o foco, Esc fecha, o foco volta pra quem
 * abriu) conforme `open`.
 */
export function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

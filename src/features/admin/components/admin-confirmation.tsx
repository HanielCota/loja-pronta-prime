'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertDialog } from 'radix-ui';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Confirmation = { title: string; description: string; confirmLabel: string };

/** Confirmações do painel: foco preso na janela e devolvido à ação ao cancelar ou confirmar. */
export function useAdminConfirmation() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => () => resolveRef.current?.(false), []);

  function finish(confirmed: boolean) {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setConfirmation(null);
  }

  function ask(next: Confirmation) {
    resolveRef.current?.(false);
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmation(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }

  const dialog = (
    <AlertDialog.Root
      open={confirmation !== null}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
        <AlertDialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto overscroll-contain rounded-card bg-card p-6 text-foreground shadow-card forced-colors:border forced-colors:border-[CanvasText]"
        >
          <AlertDialog.Title className="text-title font-semibold text-balance break-words">
            {confirmation?.title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-body text-pretty break-words text-muted-foreground">
            {confirmation?.description}
          </AlertDialog.Description>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="soft">
                <X aria-hidden="true" data-icon="inline-start" />
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button type="button" onClick={() => finish(true)}>
                <Check aria-hidden="true" data-icon="inline-start" />
                {confirmation?.confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
  return { ask, dialog };
}

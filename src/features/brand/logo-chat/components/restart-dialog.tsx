'use client';

import { SquarePenIcon } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { useDialog } from './use-dialog';

/**
 * "Nova conversa" pede confirmação: um toque sem querer apagaria a conversa toda (e os logos
 * dela). Janela nativa do navegador: prende o foco, fecha com Esc e devolve o foco ao botão.
 */
export function RestartDialog({
  open,
  generationsLeft,
  onConfirm,
  onClose,
}: {
  open: boolean;
  generationsLeft: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useDialog(open);
  const titleId = useId();
  const textId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={textId}
      onClose={onClose}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-border bg-card p-6 text-foreground shadow-card backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="text-xl font-semibold">
          Começar uma conversa nova?
        </h2>
        <p id={textId} className="text-body text-pretty text-muted-foreground">
          Esta conversa e os logos dela somem.
          {generationsLeft
            ? ` Você ainda pode criar ${generationsLeft} ${generationsLeft === 1 ? 'logo' : 'logos'}.`
            : ' Você já criou todos os logos que dava: na conversa nova, não dá pra criar outro.'}
        </p>
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={onConfirm}>
            <SquarePenIcon aria-hidden="true" />
            Começar de novo
          </Button>
          <Button type="button" variant="soft" onClick={onClose}>
            Continuar esta conversa
          </Button>
        </div>
      </div>
    </dialog>
  );
}

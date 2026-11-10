'use client';

import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Ação da equipe que muda a vida de alguém num clique só (encerrar o chamado de uma aluna, tirar
 * uma atendente do ar): o botão abre a explicação e só então aparece o botão que faz de verdade.
 * É um `<details>` de propósito — sem JavaScript ele continua abrindo, e o próprio título fecha.
 */
export function ConfirmAction({
  label,
  title,
  description,
  variant = 'ghost',
  children,
}: {
  label: string;
  title: string;
  description: string;
  variant?: 'ghost' | 'destructive';
  children: ReactNode;
}) {
  const box = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={box} className="w-fit">
      <Button
        asChild
        variant={variant}
        size="inline"
        className="w-fit cursor-pointer list-none px-4 [&::-webkit-details-marker]:hidden"
      >
        <summary>{label}</summary>
      </Button>
      <div className="mt-2 flex flex-col gap-3 rounded-2xl bg-muted p-4">
        <p className="text-body font-semibold">{title}</p>
        <p className="text-body text-muted-foreground">{description}</p>
        <div className="flex flex-wrap items-center gap-3">
          {children}
          <Button
            type="button"
            variant="ghost"
            size="inline"
            className="w-fit px-4"
            onClick={() => box.current?.removeAttribute('open')}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </details>
  );
}

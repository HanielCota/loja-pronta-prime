'use client';

import { EditorDialog } from './editor-dialog';

const TOUCH = [
  ['Escolher uma parte', 'Toque nela no quadro, ou escolha em Camadas'],
  ['Mover', 'Arraste a parte escolhida (no meio, ela encaixa sozinha)'],
  ['Mudar o tamanho', 'Arraste uma bolinha dos cantos, ou use dois dedos'],
  ['Girar', 'Arraste a bolinha de cima, ou gire dois dedos'],
  ['Soltar a parte escolhida', 'Toque no fundo do logo'],
] as const;

const KEYS = [
  ['Setas', 'Movem a parte escolhida (com Shift, mais longe)'],
  ['Delete', 'Apaga a parte escolhida'],
  ['Ctrl + Z', 'Desfaz'],
  ['Ctrl + Shift + Z', 'Refaz'],
  ['Ctrl + D', 'Duplica a parte escolhida'],
  ['Esc', 'Solta a parte escolhida'],
] as const;

/** "Ajuda": como mexer no quadro com o dedo ou o mouse, e os atalhos do teclado. */
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <EditorDialog open={open} title="Como usar o editor" onClose={onClose}>
      <Table title="Com o dedo ou o mouse" rows={TOUCH} />
      <Table title="No teclado" rows={KEYS} keys />
      <p className="text-sm text-pretty text-muted-foreground">
        Tudo o que você muda fica salvo sozinho. Errou? Desfazer volta um passo de cada vez.
      </p>
    </EditorDialog>
  );
}

function Table({
  title,
  rows,
  keys = false,
}: {
  title: string;
  rows: readonly (readonly [string, string])[];
  keys?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-body font-semibold">{title}</h3>
      <dl className="divide-y divide-border">
        {rows.map(([what, how]) => (
          <div key={what} className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[180px_1fr]">
            <dt className="text-body font-semibold">
              {keys ? (
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-sm">
                  {what}
                </kbd>
              ) : (
                what
              )}
            </dt>
            <dd className="text-body text-pretty text-muted-foreground">{how}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

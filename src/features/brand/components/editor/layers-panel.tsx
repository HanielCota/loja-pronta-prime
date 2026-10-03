'use client';

import { CircleIcon, ShapesIcon, SparklesIcon, TypeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { elementLabel } from '../../logo/editor';
import type { LogoScene, SceneElement } from '../../logo/scene';

const ICONS = { text: TypeIcon, icon: SparklesIcon, shape: ShapesIcon } as const;

export const LAYERS_TITLE_ID = 'camadas-titulo';

/**
 * As camadas, da mais da frente pra mais de trás (como no quadro). É também o jeito de escolher
 * um elemento pelo teclado ou pelo leitor de tela, que não arrastam no quadro.
 */
export function LayersPanel({
  scene,
  selectedId,
  onSelect,
  className,
}: {
  scene: LogoScene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}) {
  const layers = scene.elements.toReversed();
  return (
    <section
      aria-labelledby={LAYERS_TITLE_ID}
      className={cn('flex flex-col gap-3 rounded-card bg-card p-4 shadow-card', className)}
    >
      <h2 id={LAYERS_TITLE_ID} tabIndex={-1} className="text-body font-semibold outline-none">
        Camadas
      </h2>
      {layers.length ? (
        <ul className="flex flex-col gap-1">
          {layers.map((element) => (
            <li key={element.id}>
              <LayerButton
                element={element}
                selected={element.id === selectedId}
                onSelect={() => onSelect(element.id === selectedId ? null : element.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">O logo está vazio.</p>
      )}
      <p className="text-sm text-pretty text-muted-foreground">
        A de cima fica na frente das outras.
      </p>
    </section>
  );
}

function LayerButton({
  element,
  selected,
  onSelect,
}: {
  element: SceneElement;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon =
    element.type === 'shape' && element.shape !== 'rect' ? CircleIcon : ICONS[element.type];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-11 w-full items-center gap-2.5 rounded-xl border-[1.5px] px-3 text-left text-body outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
        selected
          ? 'border-primary bg-primary-soft font-semibold'
          : 'border-transparent hover:bg-muted',
        'forced-colors:aria-pressed:border-[Highlight]',
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-background"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 truncate">{elementLabel(element)}</span>
      <span
        aria-hidden="true"
        className="ml-auto size-4 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: element.color }}
      />
    </button>
  );
}

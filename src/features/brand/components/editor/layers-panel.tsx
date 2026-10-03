'use client';

import { CircleIcon, ShapesIcon, SparklesIcon, StickerIcon, TypeIcon } from 'lucide-react';
import { elementLabel } from '../../logo/editor';
import { elementColor, type LogoScene, type SceneElement } from '../../logo/scene';

const ICONS = {
  text: TypeIcon,
  icon: SparklesIcon,
  shape: ShapesIcon,
  sticker: StickerIcon,
} as const;

const TITLE_ID = 'partes-titulo';

/**
 * As partes do logo, da mais da frente pra mais de trás (como no quadro). Tocar numa abre ela no
 * painel. É também o jeito de escolher uma parte pelo teclado ou pelo leitor de tela, que não
 * arrastam no quadro.
 */
export function LayersPanel({
  scene,
  onSelect,
}: {
  scene: LogoScene;
  onSelect: (id: string) => void;
}) {
  const layers = scene.elements.toReversed();
  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-3">
      <h2 id={TITLE_ID} className="text-body font-semibold">
        Partes do logo
      </h2>
      {layers.length ? (
        <ul className="flex flex-col gap-1">
          {layers.map((element) => (
            <li key={element.id}>
              <LayerButton element={element} onSelect={() => onSelect(element.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-muted-foreground">O logo está vazio.</p>
      )}
    </section>
  );
}

function LayerButton({ element, onSelect }: { element: SceneElement; onSelect: () => void }) {
  const Icon =
    element.type === 'shape' && element.shape !== 'rect' ? CircleIcon : ICONS[element.type];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border-[1.5px] border-input px-3 text-left text-body outline-none hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid forced-colors:border-[ButtonText]"
    >
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-background"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 truncate">{elementLabel(element)}</span>
      {/* A cor da parte (a figurinha tem as dela: sem bolinha). */}
      {elementColor(element) ? (
        <span
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 rounded-full ring-1 ring-foreground/20"
          style={{ backgroundColor: elementColor(element) }}
        />
      ) : null}
    </button>
  );
}

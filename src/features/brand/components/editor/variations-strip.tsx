'use client';

import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';
import { MAX_VARIATIONS, type LogoScene } from '../../logo/scene';
import { renderSceneSvg, type LogoFonts } from '../../logo/scene-render';

/** A cena como imagem (SVG em data URL), pras miniaturas e a pré-visualização. */
export function sceneDataUrl(scene: LogoScene, name: string, fonts: LogoFonts): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSceneSvg(scene, name, fonts))}`;
}

/**
 * As versões: a que está no quadro e as guardadas. Tocar numa guardada troca (a do quadro vai pro
 * lugar dela); "Guardar" guarda uma cópia pra ela testar outra ideia sem perder a de agora.
 */
export function VariationsStrip({
  scene,
  variations,
  name,
  fonts,
  onChoose,
  onAdd,
  onRemove,
}: {
  scene: LogoScene;
  variations: LogoScene[];
  name: string;
  fonts: LogoFonts | null;
  onChoose: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const current = useMemo(
    () => (fonts ? sceneDataUrl(scene, name, fonts) : null),
    [scene, name, fonts],
  );
  const others = useMemo(
    () => (fonts ? variations.map((item) => sceneDataUrl(item, name, fonts)) : []),
    [variations, name, fonts],
  );
  const full = variations.length >= MAX_VARIATIONS;

  return (
    <section aria-label="Versões guardadas" className="flex flex-col gap-5">
      <p className="-mt-3 text-body text-pretty text-muted-foreground">
        Vai testar outra ideia? Guarde uma cópia antes. Pra voltar, é só tocar nela.
      </p>
      <button
        type="button"
        onClick={onAdd}
        disabled={full}
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary-soft px-6 text-body font-semibold text-link transition-[background-color,transform] duration-100 outline-none hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
      >
        <PlusIcon aria-hidden="true" className="size-5" />
        Guardar uma cópia
      </button>
      {full ? (
        <p className="-mt-2 text-body text-pretty text-muted-foreground">
          Dá pra guardar até {MAX_VARIATIONS} versões. Apague uma pra guardar outra.
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-3">
        <li>
          <figure className="flex flex-col gap-2">
            <Thumb src={current} className="border-primary ring-2 ring-primary" />
            <figcaption className="text-center text-body font-semibold">No quadro agora</figcaption>
          </figure>
        </li>
        {others.map((src, index) => (
          <li key={index} className="relative">
            <button
              type="button"
              onClick={() => onChoose(index)}
              aria-label={`Trocar pra versão ${index + 1}`}
              className="group flex w-full flex-col gap-2 rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              <Thumb src={src} className="border-input group-hover:border-primary" />
              <span className="text-center text-body text-muted-foreground group-hover:text-link">
                Versão {index + 1}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Apagar versão ${index + 1}`}
              className="absolute top-2 right-2 grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-card outline-none hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid forced-colors:border forced-colors:border-[ButtonText]"
            >
              <Trash2Icon aria-hidden="true" className="size-5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Thumb({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={200}
      height={200}
      className={`aspect-square w-full rounded-2xl border-[1.5px] bg-card ${className ?? ''}`}
    />
  ) : (
    <span
      className={`block aspect-square w-full rounded-2xl border-[1.5px] bg-muted ${className ?? ''}`}
    />
  );
}

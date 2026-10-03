'use client';

import { PlusIcon, XIcon } from 'lucide-react';
import { useMemo } from 'react';
import { MAX_VARIATIONS, type LogoScene } from '../../logo/scene';
import { renderSceneSvg, type LogoFonts } from '../../logo/scene-render';

/** A cena como imagem (SVG em data URL), pras miniaturas e a pré-visualização. */
export function sceneDataUrl(scene: LogoScene, name: string, fonts: LogoFonts): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSceneSvg(scene, name, fonts))}`;
}

/**
 * Embaixo do quadro: a versão em que ela está mexendo e as guardadas. Tocar numa guardada troca
 * (a do quadro vai pro lugar dela); "Nova variação" guarda uma cópia pra ela testar outra ideia
 * sem perder a de agora.
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
    <section aria-labelledby="variacoes-titulo" className="flex flex-col gap-2">
      <h2 id="variacoes-titulo" className="text-sm font-semibold">
        Variações
      </h2>
      <ul className="flex flex-wrap gap-2">
        <li>
          <figure className="flex flex-col items-center gap-1">
            <Thumb src={current} className="border-primary ring-2 ring-primary" />
            <figcaption className="text-xs font-semibold">Esta</figcaption>
          </figure>
        </li>
        {others.map((src, index) => (
          <li key={index} className="group relative">
            <button
              type="button"
              onClick={() => onChoose(index)}
              aria-label={`Trocar pra variação ${index + 1}`}
              className="flex flex-col items-center gap-1 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              <Thumb src={src} className="border-input group-hover:border-primary" />
              <span className="text-xs text-muted-foreground">{index + 1}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Apagar variação ${index + 1}`}
              className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onAdd}
            disabled={full}
            className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] border-dashed border-input text-xs font-semibold text-link outline-none hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50"
          >
            <PlusIcon aria-hidden="true" className="size-5" />
            Nova
            <span className="sr-only"> variação</span>
          </button>
        </li>
      </ul>
      {full ? (
        <p className="text-sm text-muted-foreground">
          Dá pra guardar até {MAX_VARIATIONS} variações. Apague uma pra criar outra.
        </p>
      ) : null}
    </section>
  );
}

function Thumb({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={64}
      height={64}
      className={`size-16 rounded-xl border-[1.5px] bg-card ${className ?? ''}`}
    />
  ) : (
    <span className={`block size-16 rounded-xl border-[1.5px] bg-muted ${className ?? ''}`} />
  );
}

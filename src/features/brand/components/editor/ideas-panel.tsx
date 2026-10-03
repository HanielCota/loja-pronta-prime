'use client';

import { ShuffleIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LOGO_LAYOUTS, type LogoConfig } from '../../logo/config';
import { LOGO_FONTS } from '../../logo/fonts';
import { configToScene } from '../../logo/from-config';
import { LOGO_COLORS } from '../../logo/palette';
import type { LogoScene } from '../../logo/scene';
import type { LogoFonts } from '../../logo/scene-render';
import { sceneDataUrl } from './variations-strip';

const PAGE = 6;

/**
 * "Ideias prontas": logos inteiros (formato, cor, letra e desenho) montados com as respostas dela,
 * 6 por vez. Um toque troca o logo pela ideia (Desfazer volta); "Outras ideias" mostra mais 6.
 */
export function IdeasPanel({
  ideas,
  name,
  fonts,
  onPick,
}: {
  ideas: LogoConfig[];
  name: string;
  fonts: LogoFonts | null;
  onPick: (scene: LogoScene, announcement: string) => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(ideas.length / PAGE);
  const options = useMemo(
    () =>
      fonts
        ? ideas.slice(page * PAGE, page * PAGE + PAGE).map((idea) => {
            const scene = configToScene(idea, name, fonts);
            return { idea, scene, src: sceneDataUrl(scene, name, fonts), label: describe(idea) };
          })
        : [],
    [ideas, page, name, fonts],
  );

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {/* A posição é a chave: duas ideias podem ter a mesma descrição (só o desenho muda). */}
        {options.map((option, index) => (
          <li key={`${page}-${index}`}>
            <button
              type="button"
              onClick={() => onPick(option.scene, `Ideia: ${option.label}`)}
              aria-label={option.label}
              className="block w-full rounded-2xl border-[1.5px] border-input bg-card p-1.5 transition-transform duration-100 outline-none hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] motion-reduce:active:scale-100 forced-colors:border-[ButtonText]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.src}
                alt=""
                width={160}
                height={160}
                className="aspect-square w-full rounded-xl"
              />
            </button>
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <Button
          type="button"
          variant="soft"
          className="-mt-2"
          onClick={() => setPage((current) => (current + 1) % pages)}
        >
          <ShuffleIcon aria-hidden="true" />
          Outras ideias
        </Button>
      ) : null}
      {/* Avisa o leitor de tela que a lista mudou (o foco fica no botão). */}
      <p aria-live="polite" className="sr-only">
        {page > 0 ? `Novas ideias: ${options.map((option) => option.label).join('; ')}` : ''}
      </p>
    </>
  );
}

/** A ideia em palavras, pro leitor de tela: "Selo redondo, rosa, letra Delicada". */
function describe(idea: LogoConfig): string {
  const layout = LOGO_LAYOUTS.find((item) => item.id === idea.layout)?.label ?? '';
  const color = LOGO_COLORS.find((item) => item.id === idea.color)?.label.toLowerCase() ?? '';
  const font = LOGO_FONTS.find((item) => item.id === idea.font)?.label ?? '';
  const background = idea.background === 'cor' ? ', fundo colorido' : '';
  return `${layout}, ${color}, letra ${font}${background}`;
}

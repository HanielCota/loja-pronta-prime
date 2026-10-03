'use client';

import { BanIcon } from 'lucide-react';
import { useId, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LOGO_LAYOUTS, type LogoConfig } from '../../logo/config';
import { LOGO_FONTS, type LogoFontId } from '../../logo/fonts';
import { configToScene } from '../../logo/from-config';
import { ICON_GROUPS, SCENE_ICONS, type SceneIconId } from '../../logo/icons';
import { IconGlyph } from './icon-glyph';
import { inkOn, LOGO_COLORS } from '../../logo/palette';
import type { LogoScene } from '../../logo/scene';
import { NAME_FALLBACK, type LogoFonts } from '../../logo/scene-render';
import {
  applyBackground,
  applyColor,
  applyFont,
  applyIcon,
  removeIcons,
  sceneStyle,
  styleToConfig,
} from '../../logo/style';
import { drawText } from '../../logo/text';
import { sceneDataUrl } from './variations-strip';

type StyleProps = {
  scene: LogoScene;
  /** Uma escolha que muda o logo todo (entra no histórico: Desfazer volta). */
  onStyle: (scene: LogoScene, announcement: string) => void;
};

/**
 * O Estilo, o jeito fácil de montar o logo (o editor abre nele): cor, fundo e letra, cada um com
 * um toque e valendo pro logo inteiro, sem desfazer o que ela arrumou à mão. Sem letra miúda: o
 * nome de cada letra vai pro leitor de tela, e a amostra fala por si.
 */
export function StylePanel({
  scene,
  name,
  fonts,
  onStyle,
}: StyleProps & { name: string; fonts: LogoFonts | null }) {
  const style = sceneStyle(scene);
  const storeName = name.trim() || NAME_FALLBACK;

  return (
    <>
      <Choices legend="Cor" columns="grid-cols-6">
        {(group) =>
          LOGO_COLORS.map((color) => (
            <label
              key={color.id}
              title={color.label}
              className="group grid cursor-pointer place-items-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid"
            >
              <input
                type="radio"
                name={group}
                aria-label={color.label}
                checked={inkOn(color.hex) === style.color}
                onChange={() => onStyle(applyColor(scene, color.hex), `Cor ${color.label}`)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                style={{ backgroundColor: color.hex }}
                className="size-9 rounded-full ring-1 ring-foreground/25 ring-offset-2 ring-offset-card forced-color-adjust-none group-has-checked:ring-[2.5px] group-has-checked:ring-foreground"
              />
            </label>
          ))
        }
      </Choices>

      <Choices legend="Fundo" columns="grid-cols-2">
        {(group) =>
          [
            { colored: false, label: 'Branco' },
            { colored: true, label: 'Colorido' },
          ].map((option) => (
            <Option
              key={option.label}
              name={group}
              label={option.label}
              checked={style.colored === option.colored}
              onSelect={() =>
                onStyle(
                  applyBackground(scene, option.colored),
                  `Fundo ${option.label.toLowerCase()}`,
                )
              }
            >
              <span
                aria-hidden="true"
                className="size-6 rounded-md border border-border"
                style={{ backgroundColor: option.colored ? style.color : '#ffffff' }}
              />
              {option.label}
            </Option>
          ))
        }
      </Choices>

      <Choices legend="Letra" columns="grid-cols-2">
        {(group) =>
          LOGO_FONTS.map((font) => (
            <Option
              key={font.id}
              name={group}
              label={font.label}
              checked={style.font === font.id}
              onSelect={() => onStyle(applyFont(scene, font.id), `Letra ${font.label}`)}
              className="min-h-16 px-3 py-3"
            >
              <FontSample font={font.id} text={storeName} fonts={fonts} />
            </Option>
          ))
        }
      </Choices>
    </>
  );
}

/**
 * O desenho principal do logo: tocar num troca ele (ou tira, em "Sem desenho"). Os recomendados
 * (das categorias dela) vêm primeiro.
 */
export function MainIconPicker({
  scene,
  recommended,
  onStyle,
}: StyleProps & { recommended: SceneIconId[] }) {
  const style = sceneStyle(scene);
  const icons = [...new Set([...recommended, ...(ICON_GROUPS[0]?.icons ?? [])])].slice(0, 11);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-body font-semibold">O desenho do logo</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2">
        <IconChoice
          label="Sem desenho"
          pressed={style.icon === null}
          onClick={() => onStyle(removeIcons(scene), 'Sem desenho')}
        >
          <BanIcon aria-hidden="true" className="size-6" />
        </IconChoice>
        {icons.map((id) => {
          const icon = SCENE_ICONS.find((item) => item.id === id);
          if (!icon) return null;
          return (
            <IconChoice
              key={id}
              label={icon.label}
              pressed={style.icon === id}
              onClick={() => onStyle(applyIcon(scene, id), `Desenho ${icon.label}`)}
            >
              <IconGlyph id={icon.id} />
            </IconChoice>
          );
        })}
      </div>
    </section>
  );
}

/** Os modelos (formatos), já com o estilo de agora; escolher um recomeça a arrumação. */
export function TemplatesPanel({
  scene,
  name,
  fonts,
  templates,
  onStyle,
}: StyleProps & { name: string; fonts: LogoFonts | null; templates: LogoConfig[] }) {
  // Só as quatro partes do estilo (não a cena inteira): arrastar uma parte não redesenha os seis.
  const { color, font, icon, colored } = sceneStyle(scene);
  const options = useMemo(
    () =>
      fonts
        ? templates.map((template) => {
            const style = { color, font, icon, colored };
            const result = configToScene(styleToConfig(style, template), name, fonts);
            return {
              template,
              scene: result,
              src: sceneDataUrl(result, name, fonts),
              label: LOGO_LAYOUTS.find((layout) => layout.id === template.layout)?.label ?? '',
            };
          })
        : [],
    [color, font, icon, colored, templates, name, fonts],
  );

  return (
    <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {options.map((option) => (
        <li key={option.template.template}>
          <button
            type="button"
            onClick={() => onStyle(option.scene, `Formato ${option.label}`)}
            aria-label={option.label}
            className="block w-full rounded-2xl border-[1.5px] border-input bg-card p-1.5 outline-none hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid forced-colors:border-[ButtonText]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={option.src}
              alt=""
              width={120}
              height={120}
              className="aspect-square w-full rounded-xl"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Um grupo de opções (uma só marcada), com o nome em cima. */
function Choices({
  legend,
  columns,
  children,
}: {
  legend: string;
  columns: string;
  children: (name: string) => ReactNode;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-body font-semibold">{legend}</legend>
      <div className={cn('grid gap-2', columns)}>{children(name)}</div>
    </fieldset>
  );
}

function Option({
  name,
  label,
  checked,
  onSelect,
  className,
  children,
}: {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-input bg-card px-2 text-body font-semibold has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid forced-colors:has-checked:border-[Highlight]',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        aria-label={label}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {children}
    </label>
  );
}

function IconChoice({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid aspect-square place-items-center rounded-xl border-[1.5px] border-transparent bg-background text-foreground outline-none hover:bg-primary-soft hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-link forced-colors:border-[ButtonText]"
    >
      {children}
    </button>
  );
}

/** O nome da loja escrito na letra, desenhado com a fonte (o navegador não tem essas fontes). */
function FontSample({
  font,
  text,
  fonts,
}: {
  font: LogoFontId;
  text: string;
  fonts: LogoFonts | null;
}) {
  const block = useMemo(
    () => (fonts ? drawText(fonts[font], text, { lines: 1, size: 100, maxWidth: 4000 }) : null),
    [fonts, font, text],
  );
  if (!block) return <span className="h-8 w-full rounded bg-muted" aria-hidden="true" />;
  const { x1, y1, x2, y2 } = block.box;
  return (
    <svg
      aria-hidden="true"
      viewBox={`${x1} ${y1} ${x2 - x1} ${y2 - y1}`}
      className="h-8 w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={block.d} fill="currentColor" />
    </svg>
  );
}

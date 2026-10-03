'use client';

import { ArrowRightIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react';
import { createElement, useState, type ReactNode } from 'react';
import { nodMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import {
  optionChecked,
  optionFocus,
} from '@/features/loja-pronta/components/question/option-styles';
import { StickyAction } from '@/features/loja-pronta/components/sticky-action';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { cn } from '@/lib/utils';
import { LOGO_BACKGROUNDS, LOGO_LAYOUTS, type LogoConfig } from '../logo/config';
import { LOGO_FONTS } from '../logo/fonts';
import { LOGO_ICONS, type LogoIconId } from '../logo/icons';
import { LOGO_COLORS } from '../logo/palette';
import { logoPreviewSrc } from '../logo-preview';
import { saveLogo } from '../server/actions';
import { BrandForm, useBrandPending } from './brand-form';

const TITLE_ID = 'estudio-titulo';

/** As partes do logo que ela pode mudar, uma por vez (menos coisa na tela de uma vez). */
const PANELS = [
  { id: 'cor', label: 'Cor' },
  { id: 'desenho', label: 'Desenho' },
  { id: 'letra', label: 'Letra' },
  { id: 'formato', label: 'Formato' },
] as const;
type PanelId = (typeof PANELS)[number]['id'];

/** Em palavras, pro leitor de tela e pro texto alternativo da prévia. */
function describe(config: LogoConfig): string {
  const layout = LOGO_LAYOUTS.find((item) => item.id === config.layout)?.label;
  const font = LOGO_FONTS.find((item) => item.id === config.font)?.label;
  const color = LOGO_COLORS.find((item) => item.id === config.color)?.label;
  const icon = LOGO_ICONS.find((item) => item.id === config.icon)?.label;
  const background = LOGO_BACKGROUNDS.find((item) => item.id === config.background)?.label;
  return `${layout}, letra ${font?.toLowerCase()}, cor ${color?.toLowerCase()}, ${
    icon ? `desenho de ${icon.toLowerCase()}` : 'sem desenho'
  }, ${background?.toLowerCase()}.`;
}

type LogoStudioProps = {
  /** Como o logo está agora (o salvo). */
  initial: LogoConfig;
  /** O modelo de onde ela partiu, pro "Voltar ao modelo". */
  base: LogoConfig;
  editing: boolean;
};

/**
 * Passo 3: o estúdio. A prévia grande em cima (e como fica no círculo da Shopee); embaixo, uma
 * parte por vez pra mudar (cor, desenho, letra, formato). Cada toque muda a prévia na hora;
 * "Desfazer" volta o último toque e "Voltar ao modelo", o logo do começo.
 */
export function LogoStudio({ initial, base, editing }: LogoStudioProps) {
  const [config, setConfig] = useState(initial);
  const [history, setHistory] = useState<LogoConfig[]>([]);
  const [panel, setPanel] = useState<PanelId>('cor');

  function change(patch: Partial<LogoConfig>) {
    setHistory((past) => [...past, config].slice(-30));
    setConfig((current) => ({ ...current, ...patch }));
    nodMascot();
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((past) => past.slice(0, -1));
    setConfig(previous);
  }

  // Campo a campo: o banco (jsonb) não guarda a ordem das chaves.
  const atBase = (Object.keys(base) as (keyof LogoConfig)[]).every(
    (key) => config[key] === base[key],
  );
  const src = logoPreviewSrc(config);

  return (
    <BrandForm action={saveLogo} editing={editing} className="gap-6">
      {/* Sem o mascote: aqui o desenho grande é o logo dela. */}
      <div className="flex flex-col gap-2 text-center">
        <h1
          id={TITLE_ID}
          tabIndex={-1}
          className="text-title font-semibold text-balance outline-none sm:text-title-lg"
        >
          Deixe o logo do seu jeito
        </h1>
        <p className="text-body text-pretty text-muted-foreground">
          Toque no que quer mudar. O logo muda na hora.
        </p>
      </div>
      <FocusOnArrival targetId={TITLE_ID} />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
        <figure className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Seu logo: ${describe(config)}`}
            width={280}
            height={280}
            className="size-64 rounded-3xl border border-border bg-card shadow-card sm:size-72"
          />
          <figcaption className="text-sm text-muted-foreground">Seu logo</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            width={112}
            height={112}
            className="size-24 rounded-full border border-border bg-card sm:size-28"
          />
          <figcaption className="text-sm text-muted-foreground">Como aparece na Shopee</figcaption>
        </figure>
      </div>
      <p aria-live="polite" className="sr-only">
        {history.length ? describe(config) : ''}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="inline"
          className="px-3"
          onClick={undo}
          disabled={!history.length}
        >
          <Undo2Icon aria-hidden="true" className="size-4" />
          Desfazer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="inline"
          className="px-3"
          onClick={() => change(base)}
          disabled={atBase}
        >
          <RotateCcwIcon aria-hidden="true" className="size-4" />
          Voltar ao modelo
        </Button>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-body font-semibold">O que você quer mudar?</legend>
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-black/[0.06] p-1">
          {PANELS.map((item) => (
            <label
              key={item.id}
              className={cn(
                'flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-2 text-body font-semibold text-muted-foreground transition-colors duration-100',
                'has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm',
                'forced-colors:has-checked:border-2 forced-colors:has-checked:border-[Highlight]',
                optionFocus,
              )}
            >
              <input
                type="radio"
                name="parte"
                value={item.id}
                checked={panel === item.id}
                onChange={() => setPanel(item.id)}
                className="sr-only"
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Todas as partes ficam no formulário (escondidas as que não estão abertas): salvar envia
          o logo inteiro, qualquer que seja a parte aberta. */}
      <Panel open={panel === 'cor'} title="Cor">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {LOGO_COLORS.map((color) => (
            <Option
              key={color.id}
              name="color"
              value={color.id}
              checked={config.color === color.id}
              onSelect={() => change({ color: color.id })}
              className="flex-col gap-1.5 py-2.5"
            >
              <span
                aria-hidden="true"
                style={{ backgroundColor: color.hex }}
                className="size-10 rounded-full ring-1 ring-black/10 forced-colors:border forced-colors:border-[CanvasText]"
              />
              <span className="text-sm">{color.label}</span>
            </Option>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LOGO_BACKGROUNDS.map((background) => (
            <Option
              key={background.id}
              name="background"
              value={background.id}
              checked={config.background === background.id}
              onSelect={() => change({ background: background.id })}
            >
              {background.label}
            </Option>
          ))}
        </div>
      </Panel>

      <Panel open={panel === 'desenho'} title="Desenho">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          <Option
            name="icon"
            value="nenhum"
            checked={config.icon === null}
            onSelect={() => change({ icon: null })}
            className="flex-col gap-1 py-2.5 text-center"
          >
            <span aria-hidden="true" className="grid size-8 place-items-center text-xl">
              –
            </span>
            <span className="text-sm">Sem desenho</span>
          </Option>
          {LOGO_ICONS.map((icon) => (
            <Option
              key={icon.id}
              name="icon"
              value={icon.id}
              checked={config.icon === icon.id}
              onSelect={() => change({ icon: icon.id as LogoIconId })}
              className="flex-col gap-1 py-2.5 text-center"
            >
              <IconGlyph node={icon.node} />
              <span className="text-sm">{icon.label}</span>
            </Option>
          ))}
        </div>
      </Panel>

      <Panel open={panel === 'letra'} title="Letra">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LOGO_FONTS.map((font) => (
            <Option
              key={font.id}
              name="font"
              value={font.id}
              checked={config.font === font.id}
              onSelect={() => change({ font: font.id })}
              className="flex-col gap-1 p-2"
            >
              <PreviewImage
                config={{ ...config, font: font.id, layout: 'nome', background: 'branco' }}
              />
              <span className="text-sm">{font.label}</span>
            </Option>
          ))}
        </div>
      </Panel>

      <Panel open={panel === 'formato'} title="Formato">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LOGO_LAYOUTS.map((layout) => (
            <Option
              key={layout.id}
              name="layout"
              value={layout.id}
              checked={config.layout === layout.id}
              onSelect={() => change({ layout: layout.id })}
              className="flex-col gap-1 p-2"
            >
              <PreviewImage config={{ ...config, layout: layout.id }} />
              <span className="text-sm">{layout.label}</span>
            </Option>
          ))}
        </div>
      </Panel>

      <input type="hidden" name="template" value={config.template} />
      <SaveButton />
    </BrandForm>
  );
}

function Panel({ open, title, children }: { open: boolean; title: string; children: ReactNode }) {
  return (
    <fieldset hidden={!open} className="flex flex-col gap-3">
      <legend className="sr-only">{title}</legend>
      {children}
    </fieldset>
  );
}

function Option({
  name,
  value,
  checked,
  onSelect,
  className,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-[1.5px] border-input bg-card px-3 text-body font-medium transition-[background-color,border-color] duration-100',
        optionFocus,
        optionChecked,
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** Miniatura do logo com uma mudança (a letra ou o formato), pra ela ver antes de tocar. */
function PreviewImage({ config }: { config: LogoConfig }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoPreviewSrc(config)}
      alt=""
      width={160}
      height={160}
      loading="lazy"
      className="aspect-square w-full rounded-xl"
    />
  );
}

/** O desenho do ícone (dados do Lucide), em tamanho de botão. */
function IconGlyph({ node }: { node: (typeof LOGO_ICONS)[number]['node'] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-8"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {node.map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs }))}
    </svg>
  );
}

function SaveButton() {
  const pending = useBrandPending();
  return (
    <StickyAction>
      <Button type="submit" loading={pending} loadingText="Salvando…">
        Gostei, continuar
        {pending ? null : <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </StickyAction>
  );
}

'use client';

import { ArrowRightIcon, CheckIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react';
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
import { LogoMockups } from './logo-mockups';

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
  /** O nome da loja, pro "Como fica por aí". */
  storeName: string;
  editing: boolean;
};

/**
 * Passo 3: o estúdio. A prévia sempre à vista; ao lado (no celular, embaixo), uma parte por vez
 * pra mudar (cor, desenho, letra, formato), e como o logo fica na Shopee, na caixa e no cartão.
 * Cada toque muda a prévia na hora; "Desfazer" volta o último toque e "Voltar ao modelo", o logo
 * do começo.
 */
export function LogoStudio({ initial, base, storeName, editing }: LogoStudioProps) {
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
    <BrandForm action={saveLogo} editing={editing}>
      {/* Celular: título, prévia (presa no topo ao rolar), opções, "Como fica por aí" e o botão.
          Computador: a prévia e o "Como fica por aí" presos à esquerda; o resto à direita. Assim o
          logo nunca sai da tela enquanto ela toca nas opções. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-14 lg:gap-y-6">
        {/* Sem o mascote: aqui o desenho grande é o logo dela. */}
        <div className="flex flex-col gap-2 text-center lg:col-start-2 lg:row-start-1 lg:text-left">
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

        {/* No celular, `contents`: a prévia e o "Como fica por aí" viram itens soltos da grade. */}
        <div className="contents lg:sticky lg:top-6 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-8 lg:self-start">
          <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:m-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <figure className="flex items-center gap-4 lg:flex-col lg:items-stretch lg:gap-0 lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-3 lg:shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Seu logo: ${describe(config)}`}
                width={400}
                height={400}
                className="size-32 shrink-0 rounded-2xl border border-border bg-card shadow-card min-[400px]:size-36 lg:aspect-square lg:size-auto lg:w-full lg:border-0 lg:shadow-none"
              />
              <div className="flex min-w-0 flex-col items-start gap-1 lg:flex-row lg:items-center lg:justify-between lg:px-1 lg:pt-2">
                <figcaption className="text-body font-semibold">Seu logo</figcaption>
                <div className="-ml-2 flex flex-col items-start lg:ml-0 lg:flex-row lg:gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="inline"
                    className="px-2 text-foreground"
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
                    className="px-2 text-foreground"
                    onClick={() => change(base)}
                    disabled={atBase}
                  >
                    <RotateCcwIcon aria-hidden="true" className="size-4" />
                    Voltar ao modelo
                  </Button>
                </div>
              </div>
            </figure>
          </div>
          <div className="order-last lg:order-none">
            <LogoMockups src={src} storeName={storeName} />
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {history.length ? describe(config) : ''}
        </p>

        <div className="flex flex-col gap-5 lg:col-start-2 lg:row-start-2">
          <fieldset>
            <legend className="sr-only">O que você quer mudar?</legend>
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

          {/* Todas as partes ficam no formulário (escondidas as que não estão abertas): salvar
              envia o logo inteiro, qualquer que seja a parte aberta. */}
          <Panel open={panel === 'cor'}>
            <Group title="Cor do logo">
              <div className="grid grid-cols-4 gap-x-1 gap-y-2 sm:grid-cols-6">
                {LOGO_COLORS.map((color) => (
                  <Swatch
                    key={color.id}
                    value={color.id}
                    hex={color.hex}
                    label={color.label}
                    checked={config.color === color.id}
                    onSelect={() => change({ color: color.id })}
                  />
                ))}
              </div>
            </Group>
            <Group title="Fundo">
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
            </Group>
          </Panel>

          <Panel open={panel === 'desenho'}>
            <Group title="Desenho" hideTitle>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
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
            </Group>
          </Panel>

          <Panel open={panel === 'letra'}>
            <Group title="Letra" hideTitle>
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
            </Group>
          </Panel>

          <Panel open={panel === 'formato'}>
            <Group title="Formato" hideTitle>
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
            </Group>
          </Panel>
        </div>

        <input type="hidden" name="template" value={config.template} />
        <SaveButton />
      </div>
    </BrandForm>
  );
}

/** Uma parte do logo (a aba aberta). Escondida, continua no formulário. */
function Panel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div hidden={!open} className="flex flex-col gap-6">
      {children}
    </div>
  );
}

/** Um grupo de opções com o nome em cima (só pro leitor de tela quando a aba já diz qual é). */
function Group({
  title,
  hideTitle = false,
  children,
}: {
  title: string;
  hideTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className={hideTitle ? 'sr-only' : 'mb-3 text-body font-semibold'}>{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Uma cor: a bolinha, com o nome embaixo. A escolhida ganha um anel e um ✓: não é só a cor que
 * diz qual está marcada.
 */
function Swatch({
  value,
  hex,
  label,
  checked,
  onSelect,
}: {
  value: string;
  hex: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        'group flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-transparent py-1.5 transition-colors duration-100 hover:bg-black/[0.04]',
        // Alto contraste: o sistema pintaria a borda "transparente"; só a escolhida ganha a dele.
        'forced-colors:border-[Canvas] forced-colors:has-checked:border-[Highlight]',
        optionFocus,
      )}
    >
      <input
        type="radio"
        name="color"
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        style={{ backgroundColor: hex }}
        className="grid size-11 place-items-center rounded-full ring-1 ring-black/10 ring-offset-2 ring-offset-background transition-shadow duration-100 forced-color-adjust-none group-has-checked:ring-[2.5px] group-has-checked:ring-foreground forced-colors:border forced-colors:border-[CanvasText]"
      >
        <CheckIcon
          strokeWidth={3}
          className="size-5 text-white opacity-0 drop-shadow-[0_1px_1px_rgb(0_0_0/0.45)] group-has-checked:opacity-100"
        />
      </span>
      <span className="max-w-full truncate text-sm group-has-checked:font-semibold">{label}</span>
    </label>
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
    // Item solto da grade: dentro de outra caixa, no celular, não ficaria preso embaixo da tela.
    <StickyAction className="order-last lg:order-none lg:col-start-2 lg:row-start-3">
      <Button type="submit" loading={pending} loadingText="Salvando…">
        Gostei, continuar
        {pending ? null : <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </StickyAction>
  );
}

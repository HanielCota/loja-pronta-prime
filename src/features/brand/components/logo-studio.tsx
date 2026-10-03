'use client';

import { ArrowRightIcon, CheckIcon, ChevronDownIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react';
import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
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

function labelOf(list: readonly { id: string; label: string }[], id: string | null) {
  return list.find((item) => item.id === id)?.label;
}

/**
 * As partes do logo, em ordem, cada uma com o que está escolhido agora: ela vê de uma vez tudo o
 * que dá pra mudar (as abas escondiam as outras) e abre uma por vez.
 */
const SECTIONS = [
  { id: 'cor', label: 'Cor', value: (config: LogoConfig) => labelOf(LOGO_COLORS, config.color) },
  {
    id: 'desenho',
    label: 'Desenho',
    value: (config: LogoConfig) => labelOf(LOGO_ICONS, config.icon) ?? 'Sem desenho',
  },
  { id: 'letra', label: 'Letra', value: (config: LogoConfig) => labelOf(LOGO_FONTS, config.font) },
  {
    id: 'formato',
    label: 'Formato',
    value: (config: LogoConfig) => labelOf(LOGO_LAYOUTS, config.layout),
  },
  {
    id: 'fundo',
    label: 'Fundo',
    value: (config: LogoConfig) =>
      // "Fundo branco" → "Branco": o cabeçalho da parte já diz "Fundo".
      labelOf(LOGO_BACKGROUNDS, config.background)
        ?.replace(/^Fundo /, '')
        .replace(/^./, (letter) => letter.toUpperCase()),
  },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

/** Em palavras, pro leitor de tela e pro texto alternativo da prévia. */
function describe(config: LogoConfig): string {
  const layout = labelOf(LOGO_LAYOUTS, config.layout);
  const font = labelOf(LOGO_FONTS, config.font);
  const color = labelOf(LOGO_COLORS, config.color);
  const icon = labelOf(LOGO_ICONS, config.icon);
  const background = labelOf(LOGO_BACKGROUNDS, config.background);
  return `${layout}, letra ${font?.toLowerCase()}, cor ${color?.toLowerCase()}, ${
    icon ? `desenho de ${icon.toLowerCase()}` : 'sem desenho'
  }, ${background?.toLowerCase()}.`;
}

/**
 * Se a prévia está presa no topo da tela (celular, rolando as opções), pra ela encolher e sobrar
 * espaço pras opções. Presa com `top: -1px`, passa 1px pra fora da tela e deixa de estar inteira.
 */
function useStuck<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setStuck(entry.intersectionRatio < 1 && entry.boundingClientRect.top < 0);
      },
      { threshold: [1] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, stuck };
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
 * Passo 3: o estúdio. A prévia sempre à vista (no computador, à esquerda; no celular, presa no
 * topo e menor enquanto ela rola) e as partes do logo numeradas, cada uma dizendo o que está
 * escolhido. Cada toque muda a prévia na hora; "Desfazer" volta o último toque e "Voltar ao
 * modelo", o logo do começo. "Como fica por aí" mostra o logo na Shopee, na caixa e no cartão.
 */
export function LogoStudio({ initial, base, storeName, editing }: LogoStudioProps) {
  const [config, setConfig] = useState(initial);
  const [history, setHistory] = useState<LogoConfig[]>([]);
  const [open, setOpen] = useState<SectionId | null>('cor');
  const { ref: previewRef, stuck: compact } = useStuck<HTMLDivElement>();

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
      {/* Celular: título, prévia (presa no topo ao rolar), as partes, "Como fica por aí" e o botão.
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
            Abra uma parte e toque numa opção. O logo muda na hora.
          </p>
        </div>
        <FocusOnArrival targetId={TITLE_ID} />

        {/* No celular, `contents`: a prévia vira item solto da grade e fica presa no topo. */}
        <div className="contents lg:sticky lg:top-6 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-8 lg:self-start">
          <div
            ref={previewRef}
            className="sticky -top-px z-10 -mx-4 bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:m-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
          >
            <figure className="flex items-center gap-4 lg:flex-col lg:items-stretch lg:gap-0 lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-3 lg:shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Seu logo: ${describe(config)}`}
                width={400}
                height={400}
                className={cn(
                  'shrink-0 rounded-2xl border border-border bg-card shadow-card motion-safe:transition-[width,height] motion-safe:duration-200',
                  compact ? 'size-20' : 'size-32 min-[400px]:size-36',
                  'lg:aspect-square lg:size-auto lg:w-full lg:border-0 lg:shadow-none',
                )}
              />
              <div className="flex min-w-0 flex-col items-start gap-1 lg:flex-row lg:items-center lg:justify-between lg:px-1 lg:pt-2">
                <figcaption className={cn('text-body font-semibold', compact && 'max-lg:sr-only')}>
                  Seu logo
                </figcaption>
                {/* Azul quando dá pra usar, cinza quando não há o que desfazer. */}
                <div className="-ml-2 flex flex-col items-start lg:ml-0 lg:flex-row lg:gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="inline"
                    className="px-2 text-link disabled:text-muted-foreground"
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
                    className="px-2 text-link disabled:text-muted-foreground"
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
          <div className="hidden lg:block">
            <LogoMockups src={src} storeName={storeName} />
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {history.length ? describe(config) : ''}
        </p>

        {/* Todas as partes ficam no formulário (as fechadas, escondidas): salvar envia o logo
            inteiro, qualquer que seja a parte aberta. */}
        <ol
          aria-label="Partes do logo"
          className="flex flex-col gap-2 lg:col-start-2 lg:row-start-2"
        >
          {SECTIONS.map((section, index) => (
            <Section
              key={section.id}
              id={section.id}
              number={index + 1}
              label={section.label}
              value={section.value(config) ?? ''}
              open={open === section.id}
              onToggle={() => setOpen((current) => (current === section.id ? null : section.id))}
            >
              {section.id === 'cor' ? (
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
              ) : null}
              {section.id === 'desenho' ? (
                <Group title="Desenho">
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
              ) : null}
              {section.id === 'letra' ? (
                <Group title="Letra">
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
                          config={{
                            ...config,
                            font: font.id,
                            layout: 'nome',
                            background: 'branco',
                          }}
                        />
                        <span className="text-sm">{font.label}</span>
                      </Option>
                    ))}
                  </div>
                </Group>
              ) : null}
              {section.id === 'formato' ? (
                <Group title="Formato">
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
              ) : null}
              {section.id === 'fundo' ? (
                <Group title="Fundo">
                  {/* O logo dela em cada fundo: ela vê antes de tocar, sem adivinhar pela palavra. */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {LOGO_BACKGROUNDS.map((background) => (
                      <Option
                        key={background.id}
                        name="background"
                        value={background.id}
                        checked={config.background === background.id}
                        onSelect={() => change({ background: background.id })}
                        className="flex-col gap-1 p-2"
                      >
                        <PreviewImage config={{ ...config, background: background.id }} />
                        <span className="text-sm">{background.label}</span>
                      </Option>
                    ))}
                  </div>
                </Group>
              ) : null}
            </Section>
          ))}
        </ol>

        {/* No celular, o "Como fica por aí" fica guardado antes do botão: aberto, empurraria o botão
            pra longe; no fim da página, ninguém chegava nele. */}
        <details className="group/mockups lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-full text-body font-semibold text-link outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid [&::-webkit-details-marker]:hidden">
            Ver como fica por aí
            <ChevronDownIcon
              aria-hidden="true"
              className="size-5 group-open/mockups:rotate-180 motion-safe:transition-transform"
            />
          </summary>
          <div className="pt-3">
            <LogoMockups src={src} storeName={storeName} hideTitle />
          </div>
        </details>

        <input type="hidden" name="template" value={config.template} />
        <SaveButton />
      </div>
    </BrandForm>
  );
}

/**
 * Uma parte do logo: o cabeçalho (número, nome e o que está escolhido) abre e fecha as opções.
 * Fechada, as opções continuam no formulário.
 */
function Section({
  id,
  number,
  label,
  value,
  open,
  onToggle,
  children,
}: {
  id: string;
  number: number;
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `parte-${id}`;
  return (
    <li className="rounded-2xl border border-border bg-card forced-colors:border-[CanvasText]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left outline-none hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold forced-colors:border forced-colors:border-[CanvasText]',
            open ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-link',
          )}
        >
          {number}
        </span>
        <span className="text-body font-semibold">{label}</span>
        <span className="ml-auto min-w-0 truncate text-body text-muted-foreground">{value}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 text-muted-foreground motion-safe:transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      <div id={panelId} hidden={!open} className="px-3 pb-4 sm:px-4">
        {children}
      </div>
    </li>
  );
}

/** Um grupo de opções; o nome é só pro leitor de tela (o cabeçalho da parte já diz qual é). */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="sr-only">{title}</legend>
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
        className="grid size-11 place-items-center rounded-full ring-1 ring-black/10 ring-offset-2 ring-offset-card transition-shadow duration-100 forced-color-adjust-none group-has-checked:ring-[2.5px] group-has-checked:ring-foreground forced-colors:border forced-colors:border-[CanvasText]"
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

/** Miniatura do logo com uma mudança (a letra, o formato ou o fundo), pra ela ver antes de tocar. */
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
    <StickyAction className="lg:col-start-2 lg:row-start-3">
      <Button type="submit" loading={pending} loadingText="Salvando…">
        Gostei, continuar
        {pending ? null : <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </StickyAction>
  );
}

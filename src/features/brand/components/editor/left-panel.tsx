'use client';

import { SearchIcon } from 'lucide-react';
import { createElement, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LogoConfig } from '../../logo/config';
import { CUSTOM_TEXT_MAX } from '../../logo/scene';
import type { LogoScene, TextElement } from '../../logo/scene';
import { LOGO_FONTS, type LogoFontId } from '../../logo/fonts';
import { ICON_GROUPS, SCENE_ICONS, type SceneIconId } from '../../logo/icons';
import { mainColor, type NewElement } from '../../logo/editor';
import { logoPreviewSrc } from '../../logo-preview';
import { LayersPanel } from './layers-panel';

const TABS = [
  { id: 'elementos', label: 'Elementos' },
  { id: 'texto', label: 'Texto' },
  { id: 'modelos', label: 'Modelos' },
  { id: 'camadas', label: 'Camadas' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** Pra onde o foco volta quando o elemento escolhido some (ver logo-editor). */
export const LEFT_PANEL_ID = 'painel-adicionar';

/** As formas da biblioteca, já no tamanho em que entram. */
const SHAPES: { label: string; element: (color: string) => NewElement }[] = [
  {
    label: 'Círculo',
    element: (color) => ({ type: 'shape', shape: 'circle', color, width: 300, height: 300 }),
  },
  {
    label: 'Anel',
    element: (color) => ({
      type: 'shape',
      shape: 'ring',
      color,
      width: 360,
      height: 360,
      stroke: 14,
    }),
  },
  {
    label: 'Quadrado',
    element: (color) => ({
      type: 'shape',
      shape: 'rect',
      color,
      width: 300,
      height: 300,
      radius: 24,
    }),
  },
  {
    label: 'Faixa',
    element: (color) => ({
      type: 'shape',
      shape: 'rect',
      color,
      width: 760,
      height: 180,
      radius: 48,
    }),
  },
  {
    label: 'Pílula',
    element: (color) => ({
      type: 'shape',
      shape: 'rect',
      color,
      width: 520,
      height: 160,
      radius: 80,
    }),
  },
  {
    label: 'Linha',
    element: (color) => ({
      type: 'shape',
      shape: 'rect',
      color,
      width: 600,
      height: 12,
      radius: 6,
    }),
  },
];

/** Sem acento e em minúsculas, pra busca achar "maca" em "Maçã". */
const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type LeftPanelProps = {
  scene: LogoScene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (element: NewElement, label: string) => void;
  /** Os desenhos que combinam com as categorias dela. */
  recommended: SceneIconId[];
  /** Os modelos prontos do estúdio, pra recomeçar de um. */
  templates: LogoConfig[];
  onApplyTemplate: (template: LogoConfig) => void;
  className?: string;
};

/**
 * À esquerda: o que dá pra pôr no logo (desenhos, formas, textos), os modelos pra recomeçar e as
 * camadas. As abas são botões de opção (as setas trocam de aba sem mexer no logo).
 */
export function LeftPanel({
  scene,
  selectedId,
  onSelect,
  onAdd,
  recommended,
  templates,
  onApplyTemplate,
  className,
}: LeftPanelProps) {
  const [tab, setTab] = useState<TabId>('elementos');
  const name = useId();
  const color = mainColor(scene);

  return (
    <div
      id={LEFT_PANEL_ID}
      tabIndex={-1}
      className={cn(
        'flex flex-col gap-3 rounded-card bg-card p-3 shadow-card outline-none',
        className,
      )}
    >
      <fieldset>
        <legend className="sr-only">Mostrar</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-segment p-1">
          {TABS.map((item) => (
            <label
              key={item.id}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-semibold text-muted-foreground has-checked:bg-segment-thumb has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-solid forced-colors:has-checked:border-2 forced-colors:has-checked:border-[Highlight]"
            >
              <input
                type="radio"
                name={name}
                value={item.id}
                checked={tab === item.id}
                onChange={() => setTab(item.id)}
                className="sr-only"
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="max-h-[calc(100dvh-260px)] min-h-0 overflow-y-auto px-1 pb-1">
        {tab === 'elementos' ? (
          <ElementsTab color={color} recommended={recommended} onAdd={onAdd} />
        ) : null}
        {tab === 'texto' ? <TextTab scene={scene} color={color} onAdd={onAdd} /> : null}
        {tab === 'modelos' ? (
          <TemplatesTab templates={templates} onApply={onApplyTemplate} />
        ) : null}
        {tab === 'camadas' ? (
          <LayersPanel
            scene={scene}
            selectedId={selectedId}
            onSelect={onSelect}
            className="p-1 shadow-none"
          />
        ) : null}
      </div>
    </div>
  );
}

function ElementsTab({
  color,
  recommended,
  onAdd,
}: {
  color: string;
  recommended: SceneIconId[];
  onAdd: LeftPanelProps['onAdd'];
}) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const term = plain(query.trim());
  const found = term ? SCENE_ICONS.filter((icon) => plain(icon.label).includes(term)) : [];
  const add = (icon: SceneIconId) =>
    onAdd(
      { type: 'icon', icon, color, size: 220 },
      SCENE_ICONS.find((item) => item.id === icon)?.label ?? 'Desenho',
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscar desenhos
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar desenhos…"
          className="min-h-11 w-full rounded-xl border-[1.5px] border-input bg-card pr-3 pl-9 text-body outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
        />
      </div>

      {term ? (
        <Group
          title={
            found.length
              ? `${found.length} ${found.length === 1 ? 'encontrado' : 'encontrados'}`
              : 'Nada encontrado'
          }
        >
          {found.map((icon) => (
            <IconButton key={icon.id} id={icon.id} onClick={() => add(icon.id)} />
          ))}
        </Group>
      ) : (
        <>
          <Group title="Recomendados pra você">
            {recommended.map((icon) => (
              <IconButton key={icon} id={icon} onClick={() => add(icon)} />
            ))}
          </Group>
          <Group title="Formas">
            {SHAPES.map((shape) => (
              <AddButton
                key={shape.label}
                label={shape.label}
                onClick={() => onAdd(shape.element(color), shape.label)}
              >
                <ShapePreview element={shape.element('currentColor')} />
              </AddButton>
            ))}
          </Group>
          {ICON_GROUPS.map((group) => (
            <Group key={group.id} title={group.label}>
              {group.icons.map((icon) => (
                <IconButton key={icon} id={icon} onClick={() => add(icon)} />
              ))}
            </Group>
          ))}
        </>
      )}
    </div>
  );
}

function TextTab({
  scene,
  color,
  onAdd,
}: {
  scene: LogoScene;
  color: string;
  onAdd: LeftPanelProps['onAdd'];
}) {
  const [value, setValue] = useState('');
  const inputId = useId();
  const nameText = scene.elements.find(
    (element): element is TextElement => element.type === 'text' && element.source === 'name',
  );
  const font: LogoFontId = nameText?.font ?? 'simples';
  const base = { type: 'text', font, color, maxWidth: 800, lines: 1, align: 'center' } as const;

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = value.trim();
          if (!text) return;
          onAdd({ ...base, source: 'custom', value: text, size: 90 }, `Texto: ${text}`);
          setValue('');
        }}
      >
        <label htmlFor={inputId} className="text-sm font-semibold">
          Escreva um texto
        </label>
        <input
          id={inputId}
          value={value}
          maxLength={CUSTOM_TEXT_MAX}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ex.: desde 2020"
          className="min-h-11 rounded-xl border-[1.5px] border-input bg-card px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="min-h-11 rounded-full bg-primary-soft text-body font-semibold text-link outline-none hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50"
        >
          Adicionar texto
        </button>
      </form>
      <Group title="Do nome da loja">
        <AddButton
          label="Nome da loja"
          wide
          onClick={() => onAdd({ ...base, source: 'name', size: 140 }, 'Nome da loja')}
        >
          <span className="text-body font-semibold">Nome</span>
        </AddButton>
        <AddButton
          label="Inicial do nome"
          wide
          onClick={() => onAdd({ ...base, source: 'initial', size: 260 }, 'Inicial do nome')}
        >
          <span className="text-body font-semibold">Inicial</span>
        </AddButton>
      </Group>
      <p className="text-sm text-pretty text-muted-foreground">
        A letra do texto novo é a mesma do nome ({LOGO_FONTS.find((f) => f.id === font)?.label}). Dá
        pra trocar depois, à direita.
      </p>
    </div>
  );
}

function TemplatesTab({
  templates,
  onApply,
}: {
  templates: LogoConfig[];
  onApply: (template: LogoConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-pretty text-muted-foreground">
        Recomece de um modelo. O que você montou some, mas Ctrl+Z traz de volta.
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {templates.map((template, index) => (
          <li key={template.template}>
            <button
              type="button"
              onClick={() => onApply(template)}
              aria-label={`Recomeçar do modelo ${index + 1}`}
              className="block w-full overflow-hidden rounded-xl border-[1.5px] border-input bg-card outline-none hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreviewSrc(template)}
                alt=""
                width={160}
                height={160}
                loading="lazy"
                className="aspect-square w-full"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
      <div className="grid grid-cols-4 gap-1.5">{children}</div>
    </section>
  );
}

function AddButton({
  label,
  onClick,
  wide = false,
  children,
}: {
  label: string;
  onClick: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Adicionar ${label}`}
      title={label}
      className={cn(
        'grid aspect-square place-items-center rounded-xl bg-background text-foreground outline-none hover:bg-primary-soft hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid forced-colors:border forced-colors:border-[ButtonText]',
        wide && 'col-span-2 aspect-auto min-h-14',
      )}
    >
      {children}
    </button>
  );
}

function IconButton({ id, onClick }: { id: SceneIconId; onClick: () => void }) {
  const icon = SCENE_ICONS.find((item) => item.id === id);
  if (!icon) return null;
  return (
    <AddButton label={icon.label} onClick={onClick}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.node.map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs }))}
      </svg>
    </AddButton>
  );
}

/** A forma em miniatura, na proporção dela. */
function ShapePreview({ element }: { element: NewElement }) {
  if (element.type !== 'shape') return null;
  const scale = 28 / Math.max(element.width, element.height);
  const width = Math.max(element.width * scale, 2);
  const height = Math.max(element.height * scale, 2);
  return (
    <svg aria-hidden="true" viewBox="-16 -16 32 32" className="size-8">
      {element.shape === 'rect' ? (
        <rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          rx={(element.radius ?? 0) * scale}
          fill="currentColor"
        />
      ) : (
        <ellipse
          rx={width / 2 - (element.shape === 'ring' ? 1.5 : 0)}
          ry={height / 2 - (element.shape === 'ring' ? 1.5 : 0)}
          fill={element.shape === 'ring' ? 'none' : 'currentColor'}
          stroke={element.shape === 'ring' ? 'currentColor' : 'none'}
          strokeWidth={3}
        />
      )}
    </svg>
  );
}

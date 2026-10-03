'use client';

import {
  AlignHorizontalJustifyCenterIcon,
  AlignHorizontalJustifyEndIcon,
  AlignHorizontalJustifyStartIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  BringToFrontIcon,
  CheckIcon,
  CircleAlertIcon,
  SendToBackIcon,
  Trash2Icon,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  alignElement,
  elementLabel,
  moveLayer,
  primarySize,
  replaceElement,
  withPrimarySize,
  type Alignment,
  type Size,
} from '../../logo/editor';
import { LOGO_FONTS } from '../../logo/fonts';
import { contrast, LOGO_COLORS } from '../../logo/palette';
import { CUSTOM_TEXT_MAX, type LogoScene, type SceneElement } from '../../logo/scene';

/** As cores do editor: as do estúdio, mais branco (pra fundo colorido) e as tintas já usadas. */
const SWATCHES = [...LOGO_COLORS, { id: 'branco', label: 'Branco', hex: '#ffffff' }];

/** O que o controle "Tamanho" permite, por tipo (em unidades da tela de 1000). */
const SIZE_RANGE = {
  text: { min: 20, max: 400 },
  icon: { min: 40, max: 900 },
  shape: { min: 40, max: 1000 },
} as const;

const ALIGNMENTS: { id: Alignment; label: string; icon: typeof CheckIcon }[] = [
  { id: 'left', label: 'Encostar à esquerda', icon: AlignHorizontalJustifyStartIcon },
  { id: 'center', label: 'Centralizar na largura', icon: AlignHorizontalJustifyCenterIcon },
  { id: 'right', label: 'Encostar à direita', icon: AlignHorizontalJustifyEndIcon },
  { id: 'top', label: 'Encostar em cima', icon: AlignVerticalJustifyStartIcon },
  { id: 'middle', label: 'Centralizar na altura', icon: AlignVerticalJustifyCenterIcon },
  { id: 'bottom', label: 'Encostar embaixo', icon: AlignVerticalJustifyEndIcon },
];

type PropertiesPanelProps = {
  scene: LogoScene;
  selected: SceneElement | undefined;
  size: Size | undefined;
  /** A cor atrás do elemento (a forma embaixo dele ou o fundo), pro aviso de contraste. */
  backdrop: string;
  onChange: (patch: Partial<SceneElement>, mode?: 'commit' | 'live') => void;
  onCommitScene: (scene: LogoScene) => void;
  onBeginGesture: (holdSave?: boolean) => void;
  onEndGesture: () => void;
  onRemove: () => void;
  className?: string;
};

/**
 * À direita: o elemento escolhido (cor, letra, tamanho, transparência, giro, posição e camada)
 * ou, sem nenhum, o fundo do logo. Deslizar um controle conta como uma mudança só no histórico.
 */
export function PropertiesPanel({
  scene,
  selected,
  size,
  backdrop,
  onChange,
  onCommitScene,
  onBeginGesture,
  onEndGesture,
  onRemove,
  className,
}: PropertiesPanelProps) {
  const shell = cn('flex flex-col gap-5 rounded-card bg-card p-4 shadow-card', className);
  const slider = { onBeginGesture, onEndGesture };

  if (!selected) {
    return (
      <section aria-labelledby="propriedades-titulo" className={shell}>
        <h2 id="propriedades-titulo" className="text-body font-semibold">
          Nenhuma parte escolhida
        </h2>
        <p className="-mt-3 text-sm text-pretty text-muted-foreground">
          Pra mudar o logo inteiro (cor, letra, desenho), use a aba Estilo. Pra mudar só uma parte,
          toque nela no quadro ou escolha nas camadas.
        </p>
        {/* Avançado: o Estilo já põe o fundo na cor do logo; aqui dá pra escolher outra. */}
        <Swatches
          legend="Só a cor do fundo"
          value={scene.background}
          onSelect={(hex) => onCommitScene({ ...scene, background: hex })}
        />
      </section>
    );
  }

  const range = SIZE_RANGE[selected.type];
  const index = scene.elements.findIndex((element) => element.id === selected.id);

  return (
    <section aria-labelledby="propriedades-titulo" className={shell}>
      <div className="flex items-center gap-2">
        <h2 id="propriedades-titulo" className="min-w-0 flex-1 text-body font-semibold">
          <span className="block text-sm font-normal text-muted-foreground">
            Elemento selecionado
          </span>
          <span className="block truncate">{elementLabel(selected)}</span>
        </h2>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Apagar ${elementLabel(selected)}`}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <Trash2Icon aria-hidden="true" className="size-5" />
        </button>
      </div>

      <Swatches legend="Cor" value={selected.color} onSelect={(hex) => onChange({ color: hex })} />
      {/* 3:1 é o mínimo pra texto grande e desenhos (WCAG): abaixo disso, some de longe. */}
      {selected.type !== 'shape' && contrast(selected.color, backdrop) < 3 ? (
        <p className="-mt-2 flex items-start gap-1.5 text-sm text-pretty text-destructive">
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Pouco contraste com o que está atrás: fica difícil de ver. Tente uma cor mais escura ou
          mais clara.
        </p>
      ) : null}

      {selected.type === 'text' && selected.source === 'custom' ? (
        <Field label="O que está escrito">
          {(id) => (
            <input
              id={id}
              defaultValue={selected.value}
              key={selected.id}
              maxLength={CUSTOM_TEXT_MAX}
              onFocus={() => onBeginGesture(false)}
              onBlur={onEndGesture}
              onChange={(event) => {
                const value = event.target.value.trim();
                if (value) onChange({ value } as Partial<SceneElement>, 'live');
              }}
              className="min-h-11 w-full rounded-xl border-[1.5px] border-input bg-card px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
            />
          )}
        </Field>
      ) : null}

      {selected.type === 'icon' ? (
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
          Desenho cheio
          <input
            type="checkbox"
            checked={selected.filled ?? false}
            onChange={(event) =>
              onChange({ filled: event.target.checked } as Partial<SceneElement>)
            }
            className="size-5 cursor-pointer accent-primary"
          />
        </label>
      ) : null}

      {selected.type === 'text' ? (
        <>
          <Field label="Letra">
            {(id) => (
              <select
                id={id}
                value={selected.font}
                onChange={(event) => onChange({ font: event.target.value as typeof selected.font })}
                className="min-h-11 w-full rounded-xl border-[1.5px] border-input bg-card px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
              >
                {LOGO_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Linhas</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-segment p-1">
              {[1, 2, 3].map((lines) => (
                <label
                  key={lines}
                  className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg text-body font-semibold text-muted-foreground has-checked:bg-segment-thumb has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-solid forced-colors:has-checked:border-2 forced-colors:has-checked:border-[Highlight]"
                >
                  <input
                    type="radio"
                    name="linhas"
                    value={lines}
                    checked={selected.lines === lines}
                    onChange={() => onChange({ lines })}
                    className="sr-only"
                  />
                  {lines}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}

      <Slider
        label="Tamanho"
        unit=""
        min={range.min}
        max={range.max}
        value={Math.round(primarySize(selected))}
        onChange={(value, mode) =>
          onChange(withPrimarySize(selected, value) as Partial<SceneElement>, mode)
        }
        {...slider}
      />
      <Slider
        label="Transparência"
        unit="%"
        min={10}
        max={100}
        value={Math.round(selected.opacity * 100)}
        onChange={(value, mode) => onChange({ opacity: value / 100 }, mode)}
        {...slider}
      />
      <Slider
        label="Giro"
        unit="°"
        min={-180}
        max={180}
        value={Math.round(selected.rotation)}
        onChange={(value, mode) => onChange({ rotation: value }, mode)}
        {...slider}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Posição</legend>
        <div className="grid grid-cols-6 gap-1">
          {ALIGNMENTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              title={label}
              disabled={!size}
              onClick={() =>
                size && onCommitScene(replaceElement(scene, alignElement(selected, size, id)))
              }
              className="grid min-h-11 place-items-center rounded-xl border-[1.5px] border-input bg-card text-foreground outline-none hover:border-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50"
            >
              <Icon aria-hidden="true" className="size-5" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Camada</legend>
        <div className="grid grid-cols-2 gap-2">
          <LayerAction
            label="Pra frente"
            icon={<BringToFrontIcon aria-hidden="true" className="size-4" />}
            disabled={index === scene.elements.length - 1}
            onClick={() => onCommitScene(moveLayer(scene, selected.id, 1))}
          />
          <LayerAction
            label="Pra trás"
            icon={<SendToBackIcon aria-hidden="true" className="size-4" />}
            disabled={index === 0}
            onClick={() => onCommitScene(moveLayer(scene, selected.id, -1))}
          />
        </div>
      </fieldset>
    </section>
  );
}

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/** As cores em bolinhas; a escolhida com anel e ✓ (não só a cor diz qual é). */
function Swatches({
  legend,
  value,
  onSelect,
}: {
  legend: string;
  value: string;
  onSelect: (hex: string) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-7 gap-1.5">
        {SWATCHES.map((color) => (
          <label
            key={color.id}
            title={color.label}
            className="group grid cursor-pointer place-items-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid"
          >
            <input
              type="radio"
              name={name}
              value={color.hex}
              checked={value === color.hex}
              onChange={() => onSelect(color.hex)}
              aria-label={color.label}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              style={{ backgroundColor: color.hex }}
              className="grid size-8 place-items-center rounded-full ring-1 ring-foreground/25 ring-offset-2 ring-offset-card forced-color-adjust-none group-has-checked:ring-[2.5px] group-has-checked:ring-foreground"
            >
              <CheckIcon
                strokeWidth={3}
                className={cn(
                  'size-4 opacity-0 group-has-checked:opacity-100',
                  color.hex === '#ffffff' ? 'text-foreground' : 'text-white',
                )}
              />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Um controle deslizante com o número ao lado (pra quem prefere digitar). Arrastar o controle é
 * uma mudança só no histórico; digitar o número, uma por número.
 */
function Slider({
  label,
  unit,
  min,
  max,
  value,
  onChange,
  onBeginGesture,
  onEndGesture,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number, mode: 'commit' | 'live') => void;
  onBeginGesture: () => void;
  onEndGesture: () => void;
}) {
  const id = useId();
  const clamp = (number: number) => Math.min(max, Math.max(min, number));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={clamp(value)}
          onPointerDown={() => onBeginGesture()}
          onPointerUp={onEndGesture}
          onKeyDown={(event) => {
            if (
              event.key.startsWith('Arrow') ||
              ['Home', 'End', 'PageUp', 'PageDown'].includes(event.key)
            ) {
              onBeginGesture();
            }
          }}
          onKeyUp={onEndGesture}
          onChange={(event) => onChange(Number(event.target.value), 'live')}
          className="h-11 min-w-0 flex-1 cursor-pointer accent-primary"
        />
        <span className="flex w-20 shrink-0 items-center rounded-xl border-[1.5px] border-input bg-card pr-2 focus-within:outline-2 focus-within:outline-ring focus-within:outline-solid">
          <input
            type="number"
            aria-label={`${label}${unit ? ` (${unit})` : ''}`}
            min={min}
            max={max}
            value={value}
            onChange={(event) => {
              const number = Number(event.target.value);
              if (Number.isFinite(number) && event.target.value !== '') {
                onChange(clamp(number), 'commit');
              }
            }}
            className="min-h-10 w-full min-w-0 bg-transparent pl-2 text-right text-body tabular-nums outline-none"
          />
          {unit ? <span className="pl-0.5 text-sm text-muted-foreground">{unit}</span> : null}
        </span>
      </div>
    </div>
  );
}

function LayerAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-input bg-card px-2 text-sm font-semibold outline-none hover:border-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

import { CheckIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { COLOR_OTHER, isCustomColor, type OnboardingQuestion } from '@/config/onboarding';
import { cn } from '@/lib/utils';
import { optionChecked, optionFocus } from './option-styles';

type ChoiceQuestion = Extract<OnboardingQuestion, { kind: 'single' | 'multi' | 'color' }>;

type OptionFieldProps = {
  question: ChoiceQuestion;
  selected: string[];
  max: number;
  /** O título da pergunta nomeia o grupo; ajuda, nota e erro o descrevem. */
  labelledBy: string;
  describedBy?: string | undefined;
  invalid: boolean;
  onChoose: (value: string, checked: boolean) => void;
};

/**
 * As opções de uma pergunta de escolha: lista (uma ou várias), chips (várias, curtas) ou cores.
 * O `<input>` fica escondido dentro do rótulo, que é o que aparece.
 */
export function OptionField({
  question,
  selected,
  max,
  labelledBy,
  describedBy,
  invalid,
  onChoose,
}: OptionFieldProps) {
  const isMulti = question.kind === 'multi';
  const layout =
    question.kind === 'color' ? 'color' : question.kind === 'multi' ? question.layout : 'list';

  return (
    <fieldset
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(
        'm-0 min-w-0 border-0 p-0',
        layout === 'list' && 'flex flex-col gap-2.5',
        layout === 'chips' && 'flex flex-wrap gap-2.5',
        layout === 'color' && 'grid grid-cols-3 gap-2',
      )}
    >
      {question.options.map((option) => {
        if (layout === 'color' && option.label === COLOR_OTHER) {
          return <CustomColor key={option.label} selected={selected} onChoose={onChoose} />;
        }
        const checked = selected.includes(option.label);
        const input = (
          <input
            type={isMulti ? 'checkbox' : 'radio'}
            name="value"
            value={option.label}
            checked={checked}
            disabled={isMulti && !checked && selected.length >= max}
            onChange={(event) => onChoose(option.label, event.target.checked)}
            className="sr-only"
          />
        );
        if (layout === 'color' && option.color) {
          return (
            <Swatch key={option.label} label={option.label} color={option.color}>
              {input}
            </Swatch>
          );
        }
        if (layout === 'chips' || layout === 'color') {
          // Na pergunta da cor, o "Escolho depois" é um chip numa linha própria.
          return (
            <Chip key={option.label} label={option.label} fullRow={layout === 'color'}>
              {input}
            </Chip>
          );
        }
        return (
          <OptionRow key={option.label} label={option.label} description={option.description}>
            {input}
          </OptionRow>
        );
      })}
    </fieldset>
  );
}

function OptionRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'group/opt flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-input bg-card px-4 py-3 text-body font-medium transition-[background-color,border-color,transform] duration-100 active:scale-[0.98] motion-reduce:active:scale-100 lg:min-h-16 lg:px-5',
        'has-disabled:cursor-not-allowed has-disabled:opacity-50',
        optionFocus,
        optionChecked,
      )}
    >
      {children}
      <span className="flex flex-1 flex-col gap-0.5">
        {label}
        {description ? (
          // Marcada, o fundo azul-claro tira contraste do cinza: o texto escurece.
          <span className="font-normal text-muted-foreground group-has-checked/opt:text-foreground/80">
            {description}
          </span>
        ) : null}
      </span>
      {/* O mesmo círculo pra uma ou várias opções (como nas listas da Apple): a pergunta diz
          quantas dá pra marcar, e o leitor de tela anuncia o tipo de campo. */}
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-muted-foreground text-primary-foreground group-has-checked/opt:border-primary group-has-checked/opt:bg-primary"
      >
        <CheckIcon className="hidden size-4 group-has-checked/opt:block" />
      </span>
    </label>
  );
}

export function Chip({
  label,
  fullRow = false,
  className,
  children,
}: {
  label: string;
  fullRow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'group/opt inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-input bg-card px-4 text-body font-medium transition-colors duration-100',
        'has-disabled:cursor-not-allowed has-disabled:opacity-50',
        fullRow && 'col-span-3 justify-self-start',
        optionFocus,
        optionChecked,
        className,
      )}
    >
      {children}
      <CheckIcon
        aria-hidden="true"
        className="hidden size-4 text-link group-has-checked/opt:block"
      />
      {label}
    </label>
  );
}

function Swatch({ label, color, children }: { label: string; color: string; children: ReactNode }) {
  return (
    <label
      className={cn(
        'group/opt flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-transparent px-1 py-3 text-body font-medium',
        optionFocus,
        optionChecked,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        style={{ backgroundColor: color }}
        className="grid size-12 place-items-center rounded-full text-white ring-1 ring-foreground/10 lg:size-14 forced-colors:border forced-colors:border-[CanvasText]"
      >
        <CheckIcon className="hidden size-6 group-has-checked/opt:block" />
      </span>
      {label}
    </label>
  );
}

/** A cor que aparece no seletor antes de ela escolher (um lilás, entre as cores da lista). */
const FIRST_CUSTOM_COLOR = '#7b4fc9';

/**
 * "Outra cor": um círculo com todas as cores. Marcado, aparece o seletor de cor do aparelho; a
 * resposta é a cor escolhida ("#rrggbb"). Não segue sozinho ao tocar: ela ainda vai escolher a
 * cor, e o "Continuar" confirma.
 */
function CustomColor({
  selected,
  onChoose,
}: {
  selected: string[];
  onChoose: (value: string, checked: boolean) => void;
}) {
  const current = selected.find(isCustomColor);
  const [color, setColor] = useState(current ?? FIRST_CUSTOM_COLOR);
  const pickerId = useId();
  const checked = Boolean(current);
  return (
    <>
      <label
        className={cn(
          'group/opt flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-transparent px-1 py-3 text-body font-medium',
          optionFocus,
          optionChecked,
        )}
      >
        <input
          type="radio"
          name="value"
          value={color}
          checked={checked}
          onChange={(event) => onChoose(color, event.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          style={{
            background: checked
              ? color
              : 'conic-gradient(#e85d8e, #f5a623, #f8e71c, #3ba776, #2f7de1, #9b7bd4, #e85d8e)',
          }}
          className="grid size-12 place-items-center rounded-full text-white ring-1 ring-foreground/10 lg:size-14 forced-colors:border forced-colors:border-[CanvasText]"
        >
          <CheckIcon className="hidden size-6 group-has-checked/opt:block" />
        </span>
        {COLOR_OTHER}
      </label>
      {checked ? (
        <p className="col-span-3 flex flex-wrap items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-body">
          <label htmlFor={pickerId} className="font-semibold">
            Toque no quadrado pra escolher a sua cor:
          </label>
          <input
            id={pickerId}
            type="color"
            value={color}
            onChange={(event) => {
              setColor(event.target.value);
              onChoose(event.target.value, true);
            }}
            className="h-12 w-20 cursor-pointer rounded-xl border border-input bg-card p-1"
          />
        </p>
      ) : null}
    </>
  );
}

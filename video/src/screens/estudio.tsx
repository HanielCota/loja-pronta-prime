import { CheckIcon } from 'lucide-react';
import { useCurrentFrame } from 'remotion';
import { cn } from '@/lib/utils';
import type { LogoPicks } from '@/features/brand/logo-studio/model';
import {
  LOGO_BACKGROUNDS,
  LOGO_BACKGROUND_IDS,
  LOGO_LETTERINGS,
  LOGO_LETTERING_IDS,
  LOGO_PALETTES,
  LOGO_PALETTE_IDS,
  LOGO_SYMBOLS,
} from '@/features/brand/logo-studio/options';
import {
  STUDIO_STEPS,
  studioSuggestions,
  type StudioStep,
} from '@/features/brand/logo-studio/picks';
import { useAnchors } from '../anchors';
import { DraftLogo } from '../components/draft-logo';
import { Pointer, type PointerPath } from '../components/pointer';
import { pop, ramp } from '../motion';
import { Sfx } from '../sfx';
import { BEAT } from '../timeline';
import { ANSWERS, STORE_NAME } from './nome';

/**
 * O estúdio do logo (fase 2, passo 2): uma escolha por tela, com o rascunho ao lado mudando na
 * hora. As opções, as sugestões e o rascunho vêm das funções do app (options.ts, picks.ts e
 * draft.ts). No computador, passar o mouse numa opção mostra no quadro como fica (como no app).
 */

export const STUDIO_ANSWERS = { ...ANSWERS, cor: 'Terracota' };
const SUGGESTIONS = studioSuggestions(STUDIO_ANSWERS);

type Choice = { value: string; label: string; description?: string; picks: LogoPicks };

const SHOWN: { step: StudioStep; number: number; hint: string; choices: Choice[] }[] = [
  {
    step: 'symbol',
    number: 2,
    hint: 'Separamos estes pelo que a sua loja vende.',
    choices: SUGGESTIONS.symbols.map((id) => ({
      value: id,
      label: LOGO_SYMBOLS[id].label,
      picks: { symbol: { id } },
    })),
  },
  {
    step: 'colors',
    number: 3,
    hint: 'As cores vão no desenho e no nome.',
    choices: LOGO_PALETTE_IDS.map((id) => ({
      value: id,
      label: LOGO_PALETTES[id].label,
      picks: { colors: { id } },
    })),
  },
  {
    step: 'lettering',
    number: 4,
    hint: `Veja como fica “${STORE_NAME}” em cada uma.`,
    choices: LOGO_LETTERING_IDS.map((id) => ({
      value: id,
      ...LOGO_LETTERINGS[id],
      picks: { lettering: { id } },
    })),
  },
  {
    step: 'background',
    number: 5,
    hint: 'É a cor atrás do desenho e do nome.',
    choices: LOGO_BACKGROUND_IDS.map((id) => ({
      value: id,
      ...LOGO_BACKGROUNDS[id],
      picks: { background: id },
    })),
  },
];

const RAIL: StudioStep[] = ['kind', 'symbol', 'colors', 'lettering', 'background', 'look'];

/** O roteiro: o toque em cada tela (escolha única avança sozinha) e as espiadas com o mouse. */
const ACTIONS = [
  { step: 'symbol', value: 'casa', tap: BEAT * 3, peeks: [] },
  {
    step: 'colors',
    value: 'terracota',
    tap: BEAT * 7.5,
    peeks: [
      { value: 'rosa', at: BEAT * 5 },
      { value: 'verde', at: BEAT * 6 },
    ],
  },
  {
    step: 'lettering',
    value: 'delicada',
    tap: BEAT * 11,
    peeks: [{ value: 'moderna', at: BEAT * 9.5 }],
  },
  { step: 'background', value: 'claro', tap: BEAT * 13.5, peeks: [] },
] as const;
const ADVANCE = 10;
/** Os toques da tela (a câmera acompanha cada um). */
export const ESTUDIO_TAPS = ACTIONS.map((action) => action.tap);

const choiceOf = (step: StudioStep, value: string) =>
  SHOWN.find((shown) => shown.step === step)!.choices.find((choice) => choice.value === value)!;

/** As escolhas feitas até o quadro, e o que o quadro mostra (com a espiada do mouse por cima). */
function picksAt(frame: number, hover: boolean) {
  let picks: LogoPicks = { kind: 'desenho' };
  let changedAt = 0;
  for (const action of ACTIONS) {
    if (hover) {
      for (const [index, peek] of action.peeks.entries()) {
        const until = action.peeks[index + 1]?.at ?? action.tap;
        if (frame >= peek.at && frame < until) {
          return {
            picks: { ...picks, ...choiceOf(action.step, peek.value).picks },
            changedAt: peek.at,
          };
        }
      }
    }
    if (frame < action.tap) break;
    picks = { ...picks, ...choiceOf(action.step, action.value).picks };
    changedAt = action.tap;
  }
  return { picks, changedAt };
}

/** O logo no fim do estúdio (as outras cenas mostram a marca pronta). */
export const FINAL_PICKS = picksAt(Infinity, false).picks;

export function EstudioScreen({ mobile }: { mobile: boolean }) {
  const frame = useCurrentFrame();
  const { container, mark, point } = useAnchors();
  const current = picksAt(frame, !mobile);
  const before = picksAt(current.changedAt - 1, !mobile);
  const change = ramp(frame, current.changedAt, current.changedAt + 6);
  const active = Math.min(
    ACTIONS.length - 1,
    ACTIONS.filter((action) => frame >= action.tap + ADVANCE).length,
  );
  const settled = ACTIONS.filter((action) => frame >= action.tap).map(
    (action) => action.step as StudioStep,
  );

  const path: PointerPath = [
    { at: BEAT, x: mobile ? 300 : 1000, y: mobile ? 700 : 620 },
    ...ACTIONS.flatMap((action) => [
      ...action.peeks.map((peek) => ({
        at: peek.at - 6,
        ...point(`tile:${action.step}:${peek.value}`, 0.5, 0.4),
      })),
      { at: action.tap - 8, ...point(`tile:${action.step}:${action.value}`, 0.5, 0.45) },
    ]),
    { at: BEAT * 15, x: mobile ? 330 : 1080, y: mobile ? 720 : 660 },
  ];

  const board = (
    <figure
      className={cn(
        'flex flex-col gap-3 rounded-card bg-card shadow-card',
        mobile ? 'mx-4 flex-row items-center p-3' : 'p-5',
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border border-border',
          mobile ? 'size-[132px] shrink-0' : 'aspect-square w-full',
        )}
        style={{ transform: `scale(${1 + (1 - change) * 0.025})` }}
      >
        <DraftLogo
          picks={before.picks}
          storeName={STORE_NAME}
          className="absolute inset-0 size-full"
        />
        <div className="absolute inset-0" style={{ opacity: change }}>
          <DraftLogo picks={current.picks} storeName={STORE_NAME} className="size-full" />
        </div>
      </div>
      <figcaption className="flex flex-col items-start gap-1.5">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Rascunho
        </span>
        <span className="text-sm text-muted-foreground">
          Muda a cada escolha. A IA desenha a versão final.
        </span>
      </figcaption>
    </figure>
  );

  return (
    <div ref={container} className="relative size-full">
      <div className={cn('flex w-full flex-col gap-2 pt-3', mobile ? 'px-4' : 'px-6')}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <span className="text-center text-body font-semibold">Passo 2 de 3</span>
          <span />
        </div>
      </div>
      <div
        className={cn(
          mobile
            ? 'flex flex-col gap-4 pt-2'
            : 'mx-auto grid max-w-[1040px] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start gap-10 px-6 pt-3',
        )}
      >
        {board}
        <div className={cn('relative flex flex-col', mobile ? 'gap-3 px-4' : 'gap-4')}>
          <ol className="flex gap-1.5">
            {RAIL.map((step, index) => {
              const on = step === 'kind' || settled.includes(step) || index === active + 1;
              return (
                <li key={step} className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span
                    className={cn(
                      'h-1.5 w-full rounded-full',
                      on ? 'bg-primary' : 'bg-progress-track',
                    )}
                  />
                  <span
                    className={cn(
                      'truncate text-sm',
                      index === active + 1
                        ? 'font-bold text-foreground'
                        : step === 'kind' || settled.includes(step)
                          ? 'text-link'
                          : 'text-muted-foreground',
                    )}
                  >
                    {STUDIO_STEPS[step].label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="relative" style={{ height: mobile ? 470 : 520 }}>
            {SHOWN.map((shown, index) => {
              const enter =
                index === 0
                  ? 1
                  : ramp(
                      frame,
                      ACTIONS[index - 1]!.tap + ADVANCE,
                      ACTIONS[index - 1]!.tap + ADVANCE + 12,
                    );
              const exit =
                index === SHOWN.length - 1
                  ? 0
                  : ramp(frame, ACTIONS[index]!.tap + ADVANCE, ACTIONS[index]!.tap + ADVANCE + 12);
              const action = ACTIONS[index]!;
              const title =
                shown.step === 'symbol'
                  ? `Qual desenho combina com a ${STORE_NAME}?`
                  : STUDIO_STEPS[shown.step].title;
              const cols =
                shown.step === 'symbol'
                  ? 'grid-cols-4 gap-2'
                  : mobile
                    ? 'grid-cols-3 gap-2'
                    : 'grid-cols-3 gap-3';
              return (
                <div
                  key={shown.step}
                  className="absolute inset-x-0 top-0 flex flex-col gap-3"
                  style={{
                    transform: `translateX(${(1 - enter) * 60 - exit * 60}px)`,
                    opacity: enter * (1 - exit),
                  }}
                >
                  <p className="text-body font-semibold text-link">Pergunta {shown.number} de 6</p>
                  <h1 className={cn('font-bold', mobile ? 'text-title' : 'text-title-lg')}>
                    {title}
                  </h1>
                  <p className="text-body text-muted-foreground">{shown.hint}</p>
                  <div className={cn('mt-1 grid', cols)}>
                    {shown.choices.map((choice) => {
                      const checked = frame >= action.tap && choice.value === action.value;
                      const suggested =
                        choice.value ===
                        (shown.step === 'symbol'
                          ? SUGGESTIONS.symbols[0]
                          : SUGGESTIONS[shown.step]);
                      const tapped =
                        frame >= action.tap - 3 &&
                        frame < action.tap + 6 &&
                        choice.value === action.value;
                      return (
                        <div
                          key={choice.value}
                          ref={mark(`tile:${shown.step}:${choice.value}`)}
                          className={cn(
                            'relative flex flex-col gap-1.5 rounded-3xl border-2 bg-card shadow-card',
                            mobile || shown.step === 'symbol' ? 'p-1.5 pb-2' : 'p-2 pb-3',
                            checked ? 'border-primary bg-primary-soft' : 'border-transparent',
                          )}
                          style={{ transform: `scale(${tapped ? 0.97 : 1})` }}
                        >
                          <DraftLogo
                            picks={{ ...picksAt(action.tap - 1, false).picks, ...choice.picks }}
                            storeName={STORE_NAME}
                            className="aspect-square w-full rounded-2xl border border-border"
                          />
                          <span
                            className={cn(
                              'px-1 leading-tight font-bold',
                              shown.step === 'symbol' || mobile ? 'text-sm' : 'text-body',
                            )}
                          >
                            {choice.label}
                          </span>
                          {suggested && !checked && !mobile ? (
                            <span className="absolute top-3 left-3 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-progress-text shadow-sm">
                              Sugestão
                            </span>
                          ) : null}
                          {checked ? (
                            <span
                              className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-primary"
                              style={{
                                transform: `scale(${pop(frame, action.tap, { bounce: true })})`,
                              }}
                            >
                              <CheckIcon
                                className="size-4 text-primary-foreground"
                                strokeWidth={3}
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Pointer path={path} taps={ACTIONS.map((action) => action.tap)} />
      {ACTIONS.map((action, index) => (
        <Sfx key={action.step} name={`tap-${(index % 4) + 1}`} at={action.tap} volume={0.5} />
      ))}
      {ACTIONS.slice(0, -1).map((action) => (
        <Sfx key={action.step} name="swipe-2" at={action.tap + ADVANCE} volume={0.16} />
      ))}
      {!mobile
        ? ACTIONS.flatMap((action) =>
            action.peeks.map((peek) => (
              <Sfx key={peek.value} name="key-3" at={peek.at} volume={0.25} />
            )),
          )
        : null}
      <Sfx name="sparkle-1" at={ACTIONS[3]!.tap + 4} volume={0.25} />
    </div>
  );
}

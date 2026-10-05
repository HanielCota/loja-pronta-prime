import { CheckIcon } from 'lucide-react';
import { useCurrentFrame } from 'remotion';
import { cn } from '@/lib/utils';
import { useAnchors } from '../anchors';
import { Mascot } from '../components/mascot';
import { Pointer } from '../components/pointer';
import { AppButton, StepTop } from '../components/ui';
import { pop, ramp } from '../motion';
import { Sfx } from '../sfx';
import { BEAT } from '../timeline';

/**
 * A conversa inicial (fase 1), na pergunta das categorias: ela toca em três, continua, e já
 * responde a próxima. Textos e classes iguais aos de src/config/onboarding.ts e
 * question/option-field.tsx.
 */

const CATEGORIES = [
  'Casa e decoração',
  'Beleza',
  'Moda e acessórios',
  'Infantil',
  'Pets',
  'Cozinha',
  'Fitness',
  'Papelaria',
  'Tecnologia',
  'Outros',
];
const PICKS = ['Casa e decoração', 'Beleza', 'Papelaria'];
const TIMES = [
  { label: 'Até 3 horas', description: 'Um pouquinho por semana' },
  { label: 'De 3 a 7 horas', description: 'Uma hora por dia, mais ou menos' },
  { label: 'De 7 a 14 horas', description: 'Umas duas horas por dia' },
  { label: 'Mais de 14 horas', description: 'Vou me dedicar bastante' },
];

/** Os toques, no tempo da música. */
const TAPS = { picks: [BEAT * 4, BEAT * 6, BEAT * 8], next: BEAT * 11, time: BEAT * 14 } as const;
const NEXT_IN = TAPS.next + 6;
/** Os toques da tela (a câmera acompanha cada um). */
export const CONVERSA_TAPS = [...TAPS.picks, TAPS.next, TAPS.time];

export function ConversaScreen({ mobile }: { mobile: boolean }) {
  const frame = useCurrentFrame();
  const { container, mark, point } = useAnchors();
  const chosen = PICKS.filter((_, index) => frame >= TAPS.picks[index]!);
  const swap = ramp(frame, NEXT_IN, NEXT_IN + 14);
  const timeChosen = frame >= TAPS.time;

  const path = [
    { at: BEAT * 2, x: mobile ? 300 : 900, y: mobile ? 700 : 640 },
    ...PICKS.map((pick, index) => ({
      at: TAPS.picks[index]! - 9,
      ...point(`chip:${pick}`, 0.55, 0.6),
    })),
    { at: TAPS.next - 12, ...point('continuar', 0.5, 0.55) },
    { at: TAPS.time - 12, ...point('tempo', 0.4, 0.55) },
  ];

  const mascotSize = mobile ? 80 : 104;
  const title = mobile ? 'text-title' : 'text-title-xl';

  return (
    <div ref={container} className="relative size-full">
      <StepTop
        label={swap < 0.5 ? 'Pergunta 4 de 10' : 'Pergunta 5 de 10'}
        total={10}
        filled={4 + ramp(frame, TAPS.next + 2, TAPS.next + 16)}
        mobile={mobile}
      />

      {/* Pergunta 4: as categorias. */}
      <div
        className={cn(
          'absolute inset-x-0 mx-auto flex flex-col',
          mobile ? 'top-[92px] gap-5 px-4' : 'top-[96px] max-w-[680px] gap-7 px-6',
        )}
        style={{ transform: `translateX(${-swap * 30}%)`, opacity: 1 - swap }}
      >
        <div className={cn('flex flex-col items-center text-center', mobile ? 'gap-3' : 'gap-4')}>
          <Mascot
            size={mascotSize}
            expressions={[
              { at: 0, value: 'neutral' },
              ...TAPS.picks.flatMap((at) => [
                { at: at + 1, value: 'happy' as const },
                { at: at + 20, value: 'neutral' as const },
              ]),
            ]}
            gaze={[
              { at: 0, value: { x: 0, y: 0.3 } },
              ...TAPS.picks.map((at, index) => ({
                at: at - 8,
                value: { x: [-0.6, 0.1, 0.5][index]!, y: 0.8 },
              })),
            ]}
            blinks={[30, 140]}
          />
          <h1 className={cn(title, 'font-semibold text-balance')}>
            Que tipo de produto você gostaria de vender?
          </h1>
          <p className="text-body text-muted-foreground">Escolha até 3.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          {CATEGORIES.map((category) => {
            const index = PICKS.indexOf(category);
            const tapped = index >= 0 ? TAPS.picks[index]! : Infinity;
            const checked = frame >= tapped;
            const full = chosen.length === 3 && !checked;
            const press =
              frame >= tapped - 3 && frame < tapped + 6 ? 1 - Math.abs(frame - tapped) / 6 : 0;
            return (
              <span
                key={category}
                ref={mark(`chip:${category}`)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-input bg-card px-4 text-body font-medium',
                  checked && 'border-primary bg-primary-soft',
                  full && 'opacity-50',
                )}
                style={{ transform: `scale(${1 - press * 0.04})` }}
              >
                {checked ? (
                  <CheckIcon
                    className="size-4 text-link"
                    aria-hidden="true"
                    style={{ transform: `scale(${pop(frame, tapped, { bounce: true })})` }}
                  />
                ) : null}
                {category}
              </span>
            );
          })}
        </div>
        <p
          className="text-center text-body text-muted-foreground"
          style={{ opacity: chosen.length ? 1 : 0 }}
        >
          {chosen.length === 3
            ? 'Você escolheu 3 de 3. Pra trocar, desmarque uma.'
            : `${chosen.length} de 3 escolhidas`}
        </p>
        <div ref={mark('continuar')}>
          <AppButton
            variant={chosen.length ? 'default' : 'off'}
            pressed={frame >= TAPS.next - 3 && frame < TAPS.next + 5 ? 1 : 0}
          >
            Continuar
          </AppButton>
        </div>
      </div>

      {/* Pergunta 5: o tempo por semana. */}
      <div
        className={cn(
          'absolute inset-x-0 mx-auto flex flex-col',
          mobile ? 'top-[92px] gap-5 px-4' : 'top-[96px] max-w-[680px] gap-6 px-6',
        )}
        style={{ transform: `translateX(${(1 - swap) * 100}%)`, opacity: swap }}
      >
        <div className={cn('flex flex-col items-center text-center', mobile ? 'gap-3' : 'gap-4')}>
          <Mascot
            size={mascotSize}
            expressions={[
              { at: 0, value: 'neutral' },
              { at: TAPS.time + 1, value: 'happy' },
            ]}
            gaze={[
              { at: 0, value: { x: 0, y: 0.3 } },
              { at: TAPS.time - 10, value: { x: -0.2, y: 0.8 } },
            ]}
            blinks={[NEXT_IN + 22]}
          />
          <h1 className={cn(title, 'font-semibold text-balance')}>
            Quanto tempo por semana você tem pra loja?
          </h1>
        </div>
        <div className="flex flex-col gap-2.5">
          {TIMES.map((option, index) => {
            const checked = index === 1 && timeChosen;
            return (
              <div
                key={option.label}
                ref={index === 1 ? mark('tempo') : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border-[1.5px] border-input bg-card px-4 py-3 text-body font-medium',
                  mobile ? 'min-h-14' : 'min-h-16 px-5',
                  checked && 'border-primary bg-primary-soft',
                )}
              >
                <span className="flex flex-1 flex-col">
                  <span>{option.label}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border-[1.5px] border-muted-foreground',
                    checked && 'border-primary bg-primary',
                  )}
                >
                  {checked ? (
                    <CheckIcon
                      className="size-4 text-primary-foreground"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Pointer path={path} taps={[...TAPS.picks, TAPS.next, TAPS.time]} />
      {TAPS.picks.map((at, index) => (
        <Sfx key={at} name={`tap-${index + 1}`} at={at} volume={0.5} />
      ))}
      <Sfx name="tap-4" at={TAPS.next} volume={0.5} />
      <Sfx name="swipe-1" at={NEXT_IN} volume={0.25} />
      <Sfx name="tap-2" at={TAPS.time} volume={0.5} />
    </div>
  );
}

import { CheckIcon, PencilIcon, ShuffleIcon, XIcon } from 'lucide-react';
import { useCurrentFrame } from 'remotion';
import { cn } from '@/lib/utils';
import { nameSuggestions } from '@/features/brand/suggestions';
import { useAnchors } from '../anchors';
import { Mascot } from '../components/mascot';
import { Pointer } from '../components/pointer';
import { AppButton, StepTop } from '../components/ui';
import { brandFamily } from '../fonts';
import { pop } from '../motion';
import { Sfx } from '../sfx';
import { BEAT } from '../timeline';

/**
 * O nome da loja (fase 2, passo 1): as ideias são as que o app monta com as respostas da
 * conversa (nameSuggestions), na letra do estilo que ela escolheu ("Delicado").
 */

export const ANSWERS = {
  categorias: ['Casa e decoração', 'Beleza', 'Papelaria'],
  estilo: 'Delicado',
};
export const STUDENT = 'Ana';
const IDEAS = nameSuggestions(ANSWERS, STUDENT);
export const STORE_NAME = IDEAS.find((idea) => idea.startsWith('Cantinho')) ?? IDEAS[0]!;

const TAPS = { idea: BEAT * 5, next: BEAT * 9 } as const;
/** Os toques da tela (a câmera acompanha cada um). */
export const NOME_TAPS = [TAPS.idea, TAPS.next];

export function NomeScreen({ mobile }: { mobile: boolean }) {
  const frame = useCurrentFrame();
  const { container, mark, point } = useAnchors();
  const named = frame >= TAPS.idea;
  const nameIn = pop(frame, TAPS.idea, { bounce: true });

  return (
    <div ref={container} className="relative size-full">
      <StepTop label="Passo 1 de 3" total={3} filled={1} mobile={mobile} />
      <div
        className={cn(
          'mx-auto flex flex-col',
          mobile ? 'gap-5 px-4 pt-6' : 'max-w-[680px] gap-6 px-6 pt-8',
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Mascot
            size={mobile ? 64 : 80}
            expressions={[
              { at: 0, value: 'neutral' },
              { at: TAPS.idea + 1, value: 'happy' },
            ]}
            gaze={[
              { at: 0, value: { x: 0, y: 0.4 } },
              { at: TAPS.idea - 10, value: { x: 0.3, y: 0.9 } },
              { at: TAPS.idea + 8, value: { x: 0, y: 0.6 } },
            ]}
            blinks={[44, 120]}
          />
          <h1 className={cn('font-semibold text-balance', mobile ? 'text-title' : 'text-title-lg')}>
            Qual o nome da sua loja?
          </h1>
        </div>

        <div
          className={cn(
            'relative flex items-center rounded-card border-[1.5px] bg-card px-14 shadow-card',
            mobile ? 'py-5' : 'py-7',
            named ? 'border-primary' : 'border-transparent',
          )}
        >
          <PencilIcon className="absolute left-5 size-5 text-muted-foreground" aria-hidden="true" />
          <span
            className={cn(
              'w-full text-center leading-tight',
              mobile ? 'text-3xl' : 'text-4xl',
              !named && 'text-muted-foreground',
            )}
            style={{
              fontFamily: named ? brandFamily('delicada') : undefined,
              transform: named ? `scale(${0.9 + 0.1 * nameIn})` : undefined,
              display: 'inline-block',
            }}
          >
            {named ? STORE_NAME : 'Escreva aqui'}
          </span>
          {named ? (
            <XIcon className="absolute right-5 size-5 text-muted-foreground" aria-hidden="true" />
          ) : null}
        </div>

        <p className="text-body font-semibold">
          {named ? 'Ou toque numa ideia' : 'Toque numa ideia'}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {IDEAS.map((idea, index) => {
            const checked = named && idea === STORE_NAME;
            const t = pop(frame, 8 + index * 4, { bounce: true });
            return (
              <span
                key={idea}
                ref={mark(`ideia:${idea}`)}
                className={cn(
                  'flex min-h-12 items-center gap-1.5 rounded-full border-[1.5px] px-4 text-lg shadow-card',
                  checked ? 'border-primary bg-primary-soft' : 'border-transparent bg-card',
                )}
                style={{
                  fontFamily: brandFamily('delicada'),
                  transform: `scale(${t})`,
                  opacity: Math.min(1, t * 2),
                }}
              >
                {checked ? <CheckIcon className="size-5 text-link" aria-hidden="true" /> : null}
                {idea}
              </span>
            );
          })}
        </div>
        <span className="inline-flex items-center gap-2 self-start text-body font-semibold text-link">
          <ShuffleIcon className="size-5" aria-hidden="true" />
          Mais ideias
        </span>
        <div ref={mark('continuar')}>
          <AppButton
            className="mt-1 min-h-14"
            variant={named ? 'default' : 'off'}
            pressed={frame >= TAPS.next - 3 && frame < TAPS.next + 5 ? 1 : 0}
          >
            {named ? `Continuar com “${STORE_NAME}”` : 'Continuar'}
          </AppButton>
        </div>
      </div>

      <Pointer
        path={[
          { at: BEAT * 2, x: mobile ? 320 : 950, y: mobile ? 640 : 600 },
          { at: TAPS.idea - 10, ...point(`ideia:${STORE_NAME}`, 0.5, 0.6) },
          { at: TAPS.next - 12, ...point('continuar', 0.5, 0.55) },
        ]}
        taps={[TAPS.idea, TAPS.next]}
      />
      {IDEAS.map((idea, index) => (
        <Sfx key={idea} name={`pop-${(index % 5) + 1}`} at={8 + index * 4} volume={0.16} />
      ))}
      <Sfx name="tap-3" at={TAPS.idea} volume={0.5} />
      <Sfx name="sparkle-2" at={TAPS.idea + 2} volume={0.18} />
      <Sfx name="tap-1" at={TAPS.next} volume={0.5} />
    </div>
  );
}

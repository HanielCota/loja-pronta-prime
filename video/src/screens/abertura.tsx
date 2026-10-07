import { useCurrentFrame } from 'remotion';
import { cn } from '@/lib/utils';
import { useAnchors } from '../anchors';
import { Mascot } from '../components/mascot';
import { Pointer } from '../components/pointer';
import { AppButton, AppNavbar, panelCard } from '../components/ui';
import { pop } from '../motion';
import { Sfx } from '../sfx';
import { BEAT } from '../timeline';

/**
 * A área da Loja Pronta no primeiro acesso (fase 1): o destaque convida pra conversa e ela toca
 * em "Começar a conversa". Textos de store-panel.tsx (heroFor, fase 1).
 */

const TAP = BEAT * 3.5;
/** Os toques da tela (a câmera acompanha cada um). */
export const ABERTURA_TAPS = [TAP];

export function AberturaScreen({ mobile }: { mobile: boolean }) {
  const frame = useCurrentFrame();
  const { container, mark, point } = useAnchors();
  // O conteúdo chega em cascata enquanto o celular sobe.
  const rise = (index: number) => {
    const t = pop(frame, 6 + index * 3);
    return { opacity: t, transform: `translateY(${(1 - t) * 18}px)` };
  };

  return (
    <div ref={container} className="relative size-full">
      <AppNavbar mobile={mobile} />
      <main
        className={cn(
          'mx-auto flex w-full flex-col',
          mobile ? 'gap-6 px-4 pt-6' : 'gap-7 px-6 pt-7',
        )}
      >
        <h1
          className={cn('font-semibold text-balance', mobile ? 'text-title' : 'text-title-lg')}
          style={rise(0)}
        >
          Vamos montar sua loja?
        </h1>
        <section className={cn(panelCard(mobile), 'gap-6')} style={rise(1)}>
          <div className="flex justify-center">
            <Mascot
              size={112}
              expressions={[
                { at: 0, value: 'neutral' },
                { at: 14, value: 'happy' },
              ]}
              gaze={[
                { at: 0, value: { x: 0, y: -0.2 } },
                { at: TAP - 12, value: { x: 0, y: 0.9 } },
              ]}
              blinks={[34]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold tracking-wide text-progress-text uppercase">
              Etapa 1 de 3
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              Conte sobre você e sua loja
            </h2>
            <p className="text-body text-pretty text-foreground/80">
              Responda a algumas perguntas sobre suas preferências e seus planos. Vamos usar suas
              respostas para sugerir ideias de nome, logo e descrição.
            </p>
            <div ref={mark('comecar')}>
              <AppButton pressed={frame >= TAP - 3 && frame < TAP + 5 ? 1 : 0}>
                Começar a conversa
              </AppButton>
            </div>
          </div>
        </section>
      </main>

      <Pointer
        path={[
          { at: BEAT, x: mobile ? 300 : 900, y: mobile ? 420 : 400 },
          { at: TAP - 10, ...point('comecar', 0.5, 0.55) },
        ]}
        taps={[TAP]}
      />
      <Sfx name="tap-1" at={TAP} volume={0.5} />
    </div>
  );
}

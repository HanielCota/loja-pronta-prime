import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Headline } from '../components/headline';
import { Mascot } from '../components/mascot';
import { useLayout } from '../layout';
import { lerp, pop, ramp } from '../motion';
import { Sfx } from '../sfx';
import { BAR, BEAT, caption } from '../timeline';

/** O fecho: o mascote comemorando, a marca, a frase e o endereço, no acorde final da música. */
export function Final() {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const line = caption('final');
  const arrive = pop(frame, 0, { bounce: true });
  const address = pop(frame, BEAT * 5, { bounce: true });
  // Some devagar com o último acorde.
  const out = ramp(frame, BAR * 4 - 24, BAR * 4);

  return (
    <AbsoluteFill className="items-center justify-center bg-background">
      <div
        className="flex flex-col items-center"
        style={{ gap: portrait ? 36 : 24, opacity: 1 - out }}
      >
        <div
          style={{
            transform: `scale(${lerp(0.4, 1, arrive)}) translateY(${Math.sin(frame / 18) * 4}px)`,
          }}
        >
          <Mascot
            size={portrait ? 440 : 320}
            expressions={[
              { at: 0, value: 'happy' },
              { at: BEAT * 2, value: 'celebrate' },
            ]}
            gaze={[
              { at: 0, value: { x: 0, y: -0.2 } },
              { at: BEAT * 3, value: { x: 0, y: 0.2 } },
            ]}
            blinks={[BEAT * 9, BEAT * 13]}
          />
        </div>
        <Headline
          text="Loja Pronta Prime"
          at={6}
          className={portrait ? 'text-center text-[96px]' : 'text-center text-[112px]'}
          stagger={4}
        />
        <Headline
          text={line.text}
          at={line.at}
          className={
            portrait
              ? 'px-16 text-center text-[54px] font-semibold text-muted-foreground'
              : 'text-center text-[50px] font-semibold text-muted-foreground'
          }
        />
        <div
          className="mt-4 rounded-full bg-primary font-semibold text-primary-foreground"
          style={{
            fontSize: portrait ? 46 : 40,
            padding: portrait ? '22px 56px' : '18px 48px',
            letterSpacing: '-0.01em',
            transform: `scale(${address})`,
            opacity: Math.min(1, address * 2),
          }}
        >
          lojaprontaprime.com
        </div>
      </div>
      <Sfx name="sparkle-2" at={2} volume={0.25} />
      <Sfx name="pop-3" at={BEAT * 5} volume={0.3} />
    </AbsoluteFill>
  );
}

import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Headline } from '../components/headline';
import { Mascot } from '../components/mascot';
import { lerp, pop } from '../motion';
import { Sfx } from '../sfx';
import { BEAT } from '../timeline';
import { reelScene } from './timeline';

/**
 * O fecho do vídeo curto: o mascote comemorando, a marca, a frase e o endereço. Curto e parado
 * no fim, pra a última imagem (a que fica na tela e na capa) ser o endereço.
 */
const ADDRESS_AT = BEAT * 1.75;

export function ReelFinal() {
  const frame = useCurrentFrame();
  const { title } = reelScene('final');
  const arrive = pop(frame, 0, { bounce: true });
  const address = pop(frame, ADDRESS_AT, { bounce: true });

  return (
    <AbsoluteFill className="items-center justify-center">
      <div className="flex flex-col items-center gap-9" style={{ marginTop: -60 }}>
        <div
          style={{
            transform: `scale(${lerp(0.4, 1, arrive)}) translateY(${Math.sin(frame / 18) * 4}px)`,
          }}
        >
          <Mascot
            size={400}
            expressions={[
              { at: 0, value: 'happy' },
              { at: BEAT, value: 'celebrate' },
            ]}
            gaze={[
              { at: 0, value: { x: 0, y: -0.2 } },
              { at: BEAT * 2, value: { x: 0, y: 0.2 } },
            ]}
            blinks={[BEAT * 3.5]}
          />
        </div>
        <Headline text="Loja Pronta Prime" at={4} stagger={3} className="text-center text-[96px]" />
        <Headline
          text={title}
          at={12}
          className="px-16 text-center text-[54px] font-semibold text-muted-foreground"
        />
        <div
          className="mt-2 rounded-full bg-primary font-semibold text-primary-foreground"
          style={{
            fontSize: 46,
            padding: '22px 56px',
            letterSpacing: '-0.01em',
            transform: `scale(${address})`,
            opacity: Math.min(1, address * 2),
          }}
        >
          lojaprontaprime.com
        </div>
      </div>
      <Sfx name="sparkle-2" at={2} volume={0.28} />
      <Sfx name="pop-3" at={ADDRESS_AT} volume={0.32} />
    </AbsoluteFill>
  );
}

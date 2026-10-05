import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Headline } from '../components/headline';
import { Mascot } from '../components/mascot';
import { Segments } from '../components/ui';
import { useLayout } from '../layout';
import { lerp, pop, ramp } from '../motion';
import { Sfx } from '../sfx';
import { BAR, BEAT, caption } from '../timeline';

/**
 * Abertura: as dúvidas de quem quer começar (O problema), o mascote chegando pra acalmar
 * (Respira) e a promessa do produto, em letra grande (Promessa).
 */

const QUESTIONS = [
  'O que vender?',
  'Qual nome dar pra loja?',
  'E o logo?',
  'Quanto cobrar?',
  'E as taxas da Shopee?',
  'Como fazer o anúncio?',
  'E se eu errar?',
  'Que foto usar?',
];

/** Onde cada dúvida aparece, em px a partir do centro (horizontal e vertical). */
const SPOTS = {
  landscape: [
    [-560, -60],
    [520, -110],
    [-380, 170],
    [430, 150],
    [-660, 300],
    [700, 320],
    [-150, 330],
    [220, -230],
  ],
  portrait: [
    [-220, -420],
    [190, -330],
    [-260, 300],
    [230, 420],
    [-150, 560],
    [170, -520],
    [-280, -250],
    [270, 250],
  ],
} as const;

export function Problema() {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const first = caption('problema', 0);
  const second = caption('problema', 1);
  const spots = portrait ? SPOTS.portrait : SPOTS.landscape;
  const start = BAR + BEAT;
  // No fim, tudo aperta em volta do mascote (a ansiedade) e se espalha no corte.
  const squeeze = ramp(frame, BAR * 3, BAR * 4 - 8);
  const scatter = ramp(frame, BAR * 4 - 8, BAR * 4);
  const headline = portrait ? 'text-center text-[84px]' : 'text-center text-[92px]';
  // O grupo sobe um pouco e fica mais baixinho: a parte de baixo da tela é da legenda da fala.
  const offsetY = portrait ? -20 : 40;
  const squash = portrait ? 0.85 : 0.9;

  return (
    <AbsoluteFill className="items-center justify-center bg-background">
      <div
        className="absolute inset-x-0 flex justify-center px-16"
        style={{ top: portrait ? 230 : 120 }}
      >
        <Headline text={first.text} at={first.at} until={first.until} className={headline} />
      </div>
      <div
        className="absolute inset-x-0 flex justify-center px-16"
        style={{ top: portrait ? 230 : 120 }}
      >
        <Headline text={second.text} at={second.at} until={second.until} className={headline} />
      </div>

      {QUESTIONS.map((text, index) => {
        const at = start + index * (BEAT * 0.75);
        if (frame < at) return null;
        const [x, y] = spots[index]!;
        const t = pop(frame, at, { bounce: true });
        const drift = Math.sin((frame + index * 20) / 22) * 6;
        const pull = 1 - squeeze * 0.22;
        const away = 1 + scatter * 1.6;
        return (
          <div
            key={text}
            className="absolute rounded-full bg-card px-7 py-4 font-semibold whitespace-nowrap text-foreground shadow-card"
            style={{
              fontSize: portrait ? 34 : 32,
              letterSpacing: '-0.02em',
              transform: `translate(${x * pull * away}px, ${(y * squash + offsetY) * pull * away + drift}px) scale(${t * (1 + squeeze * 0.06)}) rotate(${(index % 2 ? 1 : -1) * (2 + (index % 3))}deg)`,
              opacity: 1 - scatter,
            }}
          >
            {text}
          </div>
        );
      })}

      <div
        style={{
          transform: `translateY(${offsetY}px) scale(${pop(frame, 4) * (1 - scatter * 0.15)})`,
        }}
      >
        <Mascot
          size={portrait ? 360 : 300}
          expressions={[
            { at: 0, value: 'neutral' },
            { at: start + BEAT, value: 'skeptical' },
            { at: BAR * 2, value: 'worried' },
            { at: BAR * 4 - 14, value: 'surprised' },
          ]}
          gaze={[
            { at: 0, value: { x: 0, y: 0 } },
            ...QUESTIONS.map((_, index) => {
              const [x, y] = spots[index]!;
              const length = Math.hypot(x, y) || 1;
              return {
                at: start + index * (BEAT * 0.75) + 2,
                value: { x: x / length, y: y / length },
              };
            }),
            { at: BAR * 3 + BEAT, value: { x: 0, y: 0.2 } },
          ]}
          blinks={[BAR * 2 + 20, BAR * 3 + 25]}
        />
      </div>

      {QUESTIONS.map((_, index) => (
        <Sfx
          key={index}
          name={`pop-${(index % 5) + 1}`}
          at={start + index * (BEAT * 0.75)}
          volume={0.22}
        />
      ))}
      <Sfx name="whoosh-3" at={BAR * 4 - 10} volume={0.35} />
    </AbsoluteFill>
  );
}

export function Respira() {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const line = caption('respira');
  const arrive = pop(frame, 0, { bounce: true });
  const leave = ramp(frame, BAR * 3 - 10, BAR * 3);

  return (
    <AbsoluteFill className="items-center justify-center bg-background">
      <div
        className="flex flex-col items-center"
        style={{
          gap: portrait ? 40 : 28,
          transform: `translateY(${-leave * 60}px)`,
          opacity: 1 - leave,
        }}
      >
        <div style={{ transform: `scale(${lerp(0.3, 1, arrive)})` }}>
          <Mascot
            size={portrait ? 460 : 380}
            expressions={[
              { at: 0, value: 'surprised' },
              { at: 10, value: 'happy' },
            ]}
            gaze={[
              { at: 0, value: { x: 0, y: -0.3 } },
              { at: 14, value: { x: 0, y: 0.15 } },
            ]}
            blinks={[52, 98, 150]}
          />
        </div>
        <Headline
          text="Loja Pronta Prime"
          at={10}
          className={portrait ? 'text-center text-[96px]' : 'text-center text-[112px]'}
          stagger={4}
        />
        <Headline
          text={line.text}
          at={line.at}
          className={
            portrait
              ? 'text-center text-[52px] font-semibold text-muted-foreground'
              : 'text-center text-[48px] font-semibold text-muted-foreground'
          }
        />
      </div>
      <Sfx name="impact" at={0} volume={0.3} />
      <Sfx name="sparkle-1" at={4} volume={0.25} />
      <Sfx name="whoosh-1" at={BAR * 3 - 8} volume={0.3} />
    </AbsoluteFill>
  );
}

export function Promessa() {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const [shop, mine, steps] = ['Sua loja na Shopee,', 'montada por você.', 'Um passo de cada vez.'];
  const size = portrait ? 'text-[104px]' : 'text-[124px]';
  const filled = ramp(frame, BAR + 0, BAR + BEAT * 3) * 3;
  const leave = ramp(frame, BAR * 3 - 8, BAR * 3);

  return (
    <AbsoluteFill className="items-center justify-center bg-background">
      <div
        className="flex flex-col items-center"
        style={{
          gap: portrait ? 12 : 6,
          padding: portrait ? '0 70px' : 0,
          transform: `translateY(${-leave * 80}px)`,
          opacity: 1 - leave,
        }}
      >
        <Headline text={shop!} at={2} className={`${size} text-center`} />
        <Headline
          text={mine!}
          at={BEAT + 4}
          className={`${size} text-center`}
          emphasis={['você']}
        />
        <Headline
          text={steps!}
          at={BEAT * 3}
          className="text-center text-[56px] font-semibold text-muted-foreground"
        />
        <div
          style={{
            width: portrait ? 560 : 520,
            marginTop: portrait ? 56 : 44,
            opacity: ramp(frame, BAR - 6, BAR + 4),
          }}
        >
          <Segments total={3} filled={filled} className="gap-3 [&>div]:h-3" />
        </div>
      </div>
      {[0, 1, 2].map((step) => (
        <Sfx key={step} name={`check-${step + 1}`} at={BAR + BEAT * step + 6} volume={0.25} />
      ))}
    </AbsoluteFill>
  );
}

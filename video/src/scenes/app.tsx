import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { BROWSER, Device, PHONE } from '../components/device';
import { Headline } from '../components/headline';
import { punch } from '../fx';
import { useLayout } from '../layout';
import { keyed, lerp, pop, ramp } from '../motion';
import { AREA_TIMES, AreaScreen } from '../screens/area';
import { CONVERSA_TAPS, ConversaScreen } from '../screens/conversa';
import { ESTUDIO_TAPS, EstudioScreen } from '../screens/estudio';
import { NOME_TAPS, NomeScreen } from '../screens/nome';
import { Sfx } from '../sfx';
import { BAR, BEAT, SCENE_START, bars, caption, type SceneId } from '../timeline';

/**
 * O app em uso, da conversa ao SLL: o aparelho fica parado no lugar e as telas trocam dentro
 * dele, como na navegação de verdade (a nova entra pela direita). A câmera chega perto quando
 * algo importa (o logo, o caminho), acompanha cada toque com um zoom leve e volta. O título de
 * cada cena fica em cima; a legenda da fala, embaixo (Video.tsx).
 */

const START = SCENE_START.conversa;
const at = (scene: SceneId) => bars(SCENE_START[scene] - START);
export const APP_DURATION = bars(SCENE_START.final - START);

const SCREENS = [
  { from: at('conversa'), until: at('nome'), Screen: ConversaScreen, taps: CONVERSA_TAPS },
  { from: at('nome'), until: at('estudio'), Screen: NomeScreen, taps: NOME_TAPS },
  { from: at('estudio'), until: at('jornada'), Screen: EstudioScreen, taps: ESTUDIO_TAPS },
  { from: at('jornada'), until: APP_DURATION, Screen: AreaScreen, taps: [AREA_TIMES.switchTap] },
];
const PUSH = 12;
/** Todos os toques, em quadros desde o começo do app. */
const TAPS = SCREENS.flatMap((screen) => screen.taps.map((tap) => screen.from + tap));

const CAPTION_SCENES: SceneId[] = ['conversa', 'nome', 'estudio', 'jornada', 'sll'];

/** Onde a câmera está: zoom e deslocamento (em px do vídeo), por mola entre os pontos. */
function cameraKeys(portrait: boolean) {
  const studio = at('estudio');
  const area = at('jornada');
  return [
    { at: 0, zoom: 1, x: 0, y: 0 },
    // O logo pronto, de perto (o quadro do rascunho no meio da imagem).
    {
      at: studio + BEAT * 14,
      zoom: portrait ? 1.25 : 1.26,
      x: portrait ? 0 : 340,
      y: portrait ? 230 : 50,
    },
    { at: area - 2, zoom: 1, x: 0, y: 0 },
    // Na área, a página rola (como ela faria) e a câmera só chega um pouco: o título fica livre.
    { at: area + BEAT * 6, zoom: portrait ? 1 : 1.04, x: 0, y: portrait ? 0 : 18 },
    { at: area + BAR * 4 - BEAT * 3, zoom: 1, x: 0, y: 0 },
    { at: area + BAR * 4 + BEAT * 4, zoom: portrait ? 1 : 1.04, x: 0, y: portrait ? 0 : 18 },
  ];
}

export function AppInUse() {
  const frame = useCurrentFrame();
  const { portrait, width, height } = useLayout();
  const enter = pop(frame, 0);
  const leave = ramp(frame, APP_DURATION - 10, APP_DURATION);

  // O aparelho no maior tamanho que cabe entre o título e a legenda da fala.
  const top = portrait ? 400 : 170;
  const bottom = portrait ? 440 : 132;
  const device = portrait
    ? { width: PHONE.width + 24, height: PHONE.height + 24 }
    : { width: BROWSER.width, height: BROWSER.height + 44 };
  const scale = Math.min(
    (width - (portrait ? 160 : 300)) / device.width,
    (height - top - bottom) / device.height,
  );

  const keys = cameraKeys(portrait);
  const zoom = keyed(
    frame,
    keys.map((key) => ({ at: key.at, value: key.zoom })),
  );
  const cx = keyed(
    frame,
    keys.map((key) => ({ at: key.at, value: key.x })),
  );
  const cy = keyed(
    frame,
    keys.map((key) => ({ at: key.at, value: key.y })),
  );
  // Um respiro bem leve o tempo todo (imagem parada demais parece print) e o zoom nos toques.
  const drift = Math.sin(frame / 70) * 0.004;
  const tap = punch(frame, TAPS);

  return (
    <AbsoluteFill className="bg-background">
      {CAPTION_SCENES.map((scene) => {
        const line = caption(scene);
        return (
          <Sequence
            key={scene}
            from={at(scene)}
            durationInFrames={line.until + 14}
            layout="none"
            name={`título: ${scene}`}
          >
            <div
              className="absolute inset-x-0 flex justify-center"
              style={{
                top: portrait ? 150 : 46,
                padding: portrait ? '0 80px' : '0 120px',
                opacity: 1 - leave,
              }}
            >
              <Headline
                text={line.text}
                at={line.at}
                until={line.until}
                className={portrait ? 'text-center text-[68px]' : 'text-center text-[60px]'}
              />
            </div>
          </Sequence>
        );
      })}

      <div
        className="absolute left-1/2"
        style={{
          top,
          transform: `translateX(-50%) translateY(${lerp(height * 0.7, 0, enter) + leave * 60}px) scale(${1 - leave * 0.06})`,
          opacity: 1 - leave,
        }}
      >
        <div
          style={{
            transform: `translate(${cx}px, ${cy}px) scale(${(zoom + drift) * tap})`,
            transformOrigin: '50% 40%',
          }}
        >
          <Device scale={scale}>
            {SCREENS.map(({ from, until, Screen }, index) => {
              // A tela nova começa no tempo forte (os toques dela seguem a música) e a anterior
              // continua por baixo durante a passagem.
              const length = until - from;
              const last = index === SCREENS.length - 1;
              return (
                <Sequence
                  key={index}
                  from={from}
                  durationInFrames={length + (last ? 0 : PUSH)}
                  layout="none"
                >
                  <Pushed index={index} push={PUSH} length={length}>
                    <Screen mobile={portrait} />
                  </Pushed>
                </Sequence>
              );
            })}
          </Device>
        </div>
      </div>

      {SCREENS.slice(1).map(({ from }) => (
        <Sfx key={from} name="whoosh-1" at={from - 4} volume={0.28} />
      ))}
      <Sfx name="whoosh-3" at={APP_DURATION - 10} volume={0.3} />
    </AbsoluteFill>
  );
}

/** A troca de tela: a nova entra pela direita por cima, a de baixo recua um pouco e escurece. */
export function Pushed({
  index,
  push,
  length,
  children,
}: {
  index: number;
  push: number;
  /** Quanto a tela dura (depois disso, a próxima entra por cima). */
  length: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const enter = index === 0 ? 1 : ramp(frame, 0, push);
  const covered = ramp(frame, length, length + push);
  // Um borrão leve só durante a passagem: dá a sensação de movimento sem chamar atenção.
  const blur = (1 - enter) * 6;
  return (
    <AbsoluteFill
      className="bg-background"
      style={{
        transform: `translateX(${(1 - enter) * 100 - covered * 25}%)`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
        boxShadow: enter < 1 ? '-20px 0 40px rgb(0 0 0 / 0.08)' : undefined,
      }}
    >
      {children}
      {covered > 0 ? (
        <AbsoluteFill className="bg-foreground" style={{ opacity: covered * 0.08 }} />
      ) : null}
    </AbsoluteFill>
  );
}

import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { Device, PHONE } from '../components/device';
import { punch } from '../fx';
import { useLayout } from '../layout';
import { easeInOut, keyed, lerp, pop, ramp } from '../motion';
import { Pushed } from '../scenes/app';
import { ABERTURA_TAPS, AberturaScreen } from '../screens/abertura';
import { AreaScreen } from '../screens/area';
import { CONVERSA_TAPS, ConversaScreen } from '../screens/conversa';
import { ESTUDIO_TAPS, EstudioScreen } from '../screens/estudio';
import { NOME_TAPS, NomeScreen } from '../screens/nome';
import { Sfx } from '../sfx';
import { BEAT } from '../timeline';
import { reelScene } from './timeline';

/**
 * O celular, do primeiro toque ao caminho da loja: ele sobe girando até ficar de frente, as
 * telas trocam dentro dele como na navegação de verdade e, no fim, ele desce pra dar lugar ao
 * fecho. Um balanço leve em 3D o tempo todo (celular parado demais parece print) e a câmera
 * chega perto quando o logo muda.
 */

const SCREENS = [
  { scene: 'abertura', Screen: AberturaScreen, taps: ABERTURA_TAPS },
  { scene: 'conversa', Screen: ConversaScreen, taps: CONVERSA_TAPS },
  { scene: 'nome', Screen: NomeScreen, taps: NOME_TAPS },
  { scene: 'estudio', Screen: EstudioScreen, taps: ESTUDIO_TAPS },
  // Na área, a marca fica pronta e a página rola até o caminho; corta antes da troca pro SLL.
  { scene: 'jornada', Screen: AreaScreen, taps: [] },
] as const;

export const STAGE_END = reelScene('final').from;
const PUSH = 12;
const TAPS = SCREENS.flatMap(({ scene, taps }) => taps.map((tap) => reelScene(scene).from + tap));

const studio = reelScene('estudio').from;
const area = reelScene('jornada').from;
/** Onde a câmera chega perto do logo (o rascunho fica no topo da tela do celular). */
export const LOGO_ZOOM_AT = studio + BEAT * 9.5;

/** Zoom e deslocamento da câmera (px do vídeo), por mola entre os pontos. */
const CAMERA = [
  { at: 0, zoom: 1, y: 0 },
  { at: LOGO_ZOOM_AT, zoom: 1.3, y: 250 },
  { at: area - 2, zoom: 1, y: 0 },
  // A marca pronta: chega um pouco no destaque e volta antes de a página rolar.
  { at: area + BEAT * 2, zoom: 1.06, y: 70 },
  { at: area + BEAT * 6, zoom: 1, y: 0 },
];

export function PhoneStage() {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  const enter = pop(frame, 0);
  const leave = ramp(frame, STAGE_END - 16, STAGE_END, easeInOut);

  // O maior celular que cabe entre o título (em cima) e a margem de baixo.
  const top = 400;
  const device = { width: PHONE.width + 24, height: PHONE.height + 24 };
  const scale = Math.min((width - 160) / device.width, (height - top - 110) / device.height);

  const zoom = keyed(
    frame,
    CAMERA.map((key) => ({ at: key.at, value: key.zoom })),
  );
  const cy = keyed(
    frame,
    CAMERA.map((key) => ({ at: key.at, value: key.y })),
  );
  const tap = punch(frame, TAPS);
  const rotateX = lerp(34, 0, enter) + leave * 16 + Math.sin(frame / 95) * 1.2;
  const rotateY = lerp(-24, 0, enter) + Math.sin(frame / 70) * 2.5;
  const rotateZ = lerp(-7, 0, enter);
  const rise = lerp(height, 0, enter) + leave * leave * height;

  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      {/* A sombra no "chão": acompanha o celular e some quando ele sai. */}
      <div
        className="absolute left-1/2 rounded-full bg-foreground"
        style={{
          top: top + device.height * scale + 30,
          width: device.width * scale * 0.8,
          height: 70,
          transform: `translateX(-50%) scale(${lerp(0.6, 1, enter)})`,
          opacity: 0.16 * enter * (1 - leave),
          filter: 'blur(36px)',
        }}
      />
      <div
        className="absolute left-1/2"
        style={{
          top,
          // Depois de sair, nem desenha (os sons da saída continuam tocando).
          visibility: frame > STAGE_END ? 'hidden' : undefined,
          transform: `translateX(-50%) translateY(${rise}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
          transformOrigin: '50% 60%',
        }}
      >
        <div
          style={{
            transform: `translateY(${cy}px) scale(${zoom * tap})`,
            transformOrigin: '50% 40%',
          }}
        >
          <Device scale={scale}>
            {SCREENS.map(({ scene, Screen }, index) => {
              const { from, length } = reelScene(scene);
              const last = index === SCREENS.length - 1;
              return (
                <Sequence
                  key={scene}
                  from={from}
                  durationInFrames={length + (last ? 0 : PUSH)}
                  layout="none"
                  name={`tela: ${scene}`}
                >
                  <Pushed index={index} push={PUSH} length={length}>
                    <Screen mobile />
                  </Pushed>
                </Sequence>
              );
            })}
          </Device>
        </div>
      </div>

      {/* O celular chega (ar subindo e um grave macio quando para) e sai do mesmo jeito. */}
      <Sfx name="whoosh-3" at={0} volume={0.32} />
      <Sfx name="impact" at={14} volume={0.12} />
      {SCREENS.slice(1).map(({ scene }) => (
        <Sfx key={scene} name="whoosh-1" at={reelScene(scene).from - 4} volume={0.26} />
      ))}
      <Sfx name="whoosh-2" at={LOGO_ZOOM_AT - 4} volume={0.14} />
      <Sfx name="whoosh-3" at={STAGE_END - 16} volume={0.3} />
    </AbsoluteFill>
  );
}

import { Audio } from '@remotion/media';
import type { CSSProperties } from 'react';
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Headline } from '../components/headline';
import { manrope } from '../fonts';
import { ReelFinal } from './final';
import { PhoneStage } from './phone-stage';
import { REEL_SCENES, reelScene } from './timeline';

/**
 * O vídeo curto (Reels, Stories, TikTok): o app no celular em 30 segundos, com a trilha
 * ambiente (scripts/ambient.ts) por baixo dos toques e das passagens. Sem narração: o título de
 * cada cena diz o que está acontecendo, então o vídeo funciona também sem som.
 */

/** A trilha entra em meio segundo; a saída já vem no arquivo (o último acorde soando). */
const MUSIC_VOLUME = 0.75;

export function Reel() {
  return (
    <AbsoluteFill
      className="bg-background font-sans text-foreground antialiased"
      style={{ '--font-manrope': manrope } as CSSProperties}
    >
      <Glow />

      {REEL_SCENES.filter((scene) => scene.id !== 'final').map((scene) => {
        const { from, length } = reelScene(scene.id);
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={length}
            layout="none"
            name={`título: ${scene.id}`}
          >
            <div className="absolute inset-x-0 flex justify-center px-20" style={{ top: 150 }}>
              <Headline
                text={scene.title}
                at={scene.id === 'abertura' ? 10 : 4}
                until={length - 10}
                className="text-center text-[72px]"
              />
            </div>
          </Sequence>
        );
      })}

      <PhoneStage />
      <Sequence from={reelScene('final').from} name="Final">
        <ReelFinal />
      </Sequence>

      <Audio
        src={staticFile('audio/ambiente.wav')}
        volume={(frame) =>
          interpolate(frame, [0, 15], [0, MUSIC_VOLUME], { extrapolateRight: 'clamp' })
        }
      />
    </AbsoluteFill>
  );
}

/** Duas manchas de luz azul-clara bem desfocadas, andando devagar: o fundo não fica chapado. */
function Glow() {
  const frame = useCurrentFrame();
  const spots = [
    { x: -260, y: 260, size: 900, speed: 140 },
    { x: 520, y: 1260, size: 1000, speed: 170 },
  ];
  return (
    <AbsoluteFill className="overflow-hidden">
      {spots.map((spot) => (
        <div
          key={spot.speed}
          className="absolute rounded-full bg-primary-soft"
          style={{
            left: spot.x + Math.sin(frame / spot.speed) * 80,
            top: spot.y + Math.cos(frame / spot.speed) * 60,
            width: spot.size,
            height: spot.size,
            filter: 'blur(140px)',
            opacity: 0.9,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

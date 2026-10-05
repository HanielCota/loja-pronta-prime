import { useId } from 'react';
import { Img, useCurrentFrame } from 'remotion';
import {
  BROWS,
  BROW_STROKE,
  CHEEKS,
  EYES,
  EYE_AREA_SCALE,
  IMAGE_SIZE,
  INK,
  MOUTH,
} from '@/components/brand/mascot/art';
import mascotBase from '@/components/brand/mascot/assets/mascote-base.png';
import mascotClosedEyes from '@/components/brand/mascot/assets/mascote-olhos-fechados.png';
import {
  EXPRESSIONS,
  browShape,
  closedAmount,
  mouthShape,
  type Expression,
} from '@/components/brand/mascot/face';
import { keyed } from '../motion';

/**
 * O mascote do app, com o mesmo rosto (art.ts e face.ts), mas comandado pelo quadro do vídeo em
 * vez do mouse: expressões, olhar e piscadas marcados no tempo. Assim ele "atua" em cada cena.
 */

type Keys<T> = readonly { at: number; value: T }[];

export type MascotProps = {
  /** Largura em px. */
  size: number;
  /** Expressões ao longo da cena (a primeira vale desde o começo). */
  expressions?: Keys<Expression>;
  /** Pra onde ele olha: x e y de -1 a 1. */
  gaze?: Keys<{ x: number; y: number }>;
  /** Quadros em que ele pisca. */
  blinks?: readonly number[];
  className?: string;
};

const pct = (value: number) => `${(value / IMAGE_SIZE) * 100}%`;
const BLINK = 7;

/** Quanto a pálpebra fecha numa piscada (desce rápido, sobe um pouco mais devagar). */
function blinkAt(frame: number, blinks: readonly number[]) {
  for (const at of blinks) {
    const t = frame - at;
    if (t >= 0 && t < BLINK) return t < 3 ? t / 3 : 1 - (t - 3) / (BLINK - 3);
  }
  return 0;
}

export function Mascot({
  size,
  expressions = [{ at: 0, value: 'neutral' }],
  gaze = [{ at: 0, value: { x: 0, y: 0 } }],
  blinks = [],
  className,
}: MascotProps) {
  const frame = useCurrentFrame();
  const id = useId().replace(/[^\w-]/g, '');

  // Cada traço do rosto anda por mola até a expressão marcada.
  const face = Object.fromEntries(
    (Object.keys(EXPRESSIONS.neutral) as (keyof (typeof EXPRESSIONS)['neutral'])[]).map((trait) => [
      trait,
      keyed(
        frame,
        expressions.map(({ at, value }) => ({ at, value: EXPRESSIONS[value][trait] })),
      ),
    ]),
  ) as { -readonly [K in keyof (typeof EXPRESSIONS)['neutral']]: number };
  const gx = keyed(
    frame,
    gaze.map(({ at, value }) => ({ at, value: value.x })),
  );
  const gy = keyed(
    frame,
    gaze.map(({ at, value }) => ({ at, value: value.y })),
  );
  const lid = Math.max(face.lid, blinkAt(frame, blinks));
  const closed = closedAmount(lid);
  const mouth = mouthShape(face.mouth);
  // O app desloca o rosto em px pro mascote de 132px; aqui, na proporção do tamanho.
  const unit = size / 132;

  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${gx * 2 * unit}px, ${gy * 1.5 * unit}px) rotate(${gx * 4 + face.tilt}deg)`,
        }}
      >
        <Img
          src={mascotBase}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        {EYES.map((eye) => {
          const areaRx = eye.rx * EYE_AREA_SCALE;
          const areaRy = eye.ry * EYE_AREA_SCALE;
          const travelX = ((eye.rx - eye.pupilW / 2) / eye.pupilW) * 100;
          const travelY = ((eye.ry - eye.pupilH / 2) / eye.pupilH) * 100;
          return (
            <div
              key={eye.cx}
              style={{
                position: 'absolute',
                overflow: 'hidden',
                borderRadius: '50%',
                left: pct(eye.cx - areaRx),
                top: pct(eye.cy - areaRy),
                width: pct(areaRx * 2),
                height: pct(areaRy * 2),
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  borderRadius: '50%',
                  backgroundColor: INK,
                  width: `${(eye.pupilW / (areaRx * 2)) * 100}%`,
                  height: `${(eye.pupilH / (areaRy * 2)) * 100}%`,
                  transform: `translate(calc(-50% + ${gx * travelX}%), calc(-50% + ${gy * travelY}%)) scale(${face.pupil})`,
                }}
              />
              {/* A pálpebra: a pele da arte de olhos fechados, descendo sobre o olho. */}
              <Img
                src={mascotClosedEyes}
                style={{
                  position: 'absolute',
                  maxWidth: 'none',
                  width: `${(IMAGE_SIZE / (areaRx * 2)) * 100}%`,
                  height: `${(IMAGE_SIZE / (areaRy * 2)) * 100}%`,
                  left: `${(-(eye.cx - areaRx) / (areaRx * 2)) * 100}%`,
                  top: `${(-(eye.cy - areaRy) / (areaRy * 2)) * 100}%`,
                  clipPath: `inset(${((eye.cy - areaRy) / IMAGE_SIZE) * 100}% 0 ${(1 - (eye.cy - areaRy + areaRy * 2 * lid) / IMAGE_SIZE) * 100}% 0)`,
                }}
              />
            </div>
          );
        })}
        {EYES.map((eye) => (
          <Img
            key={eye.cx}
            src={mascotClosedEyes}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: closed,
              clipPath: `ellipse(${pct(eye.rx * 1.25)} ${pct(eye.ry * 1.25)} at ${pct(eye.cx)} ${pct(eye.cy)})`,
            }}
          />
        ))}
        <svg
          viewBox={`0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          <defs>
            <radialGradient id={`${id}-blush`}>
              <stop offset="0%" stopColor="#ff6f9f" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ff6f9f" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${id}-mouth`}>
              <path d={mouth.d} />
            </clipPath>
          </defs>
          {EYES.map((eye) => (
            <path
              key={eye.cx}
              opacity={closed}
              d={`M${eye.cx - eye.rx * 0.72} ${eye.cy + eye.ry * 0.05} Q${eye.cx} ${eye.cy + eye.ry * 0.6} ${eye.cx + eye.rx * 0.72} ${eye.cy + eye.ry * 0.05}`}
              fill="none"
              stroke={INK}
              strokeWidth={BROW_STROKE}
              strokeLinecap="round"
            />
          ))}
          <g opacity={Math.max(0, face.mouth)}>
            {CHEEKS.map((cheek) => (
              <ellipse key={cheek.cx} {...cheek} fill={`url(#${id}-blush)`} />
            ))}
          </g>
          {BROWS.map((brow, index) => (
            <path
              key={brow.outer[0]}
              d={browShape(index, face)}
              fill="none"
              stroke={INK}
              strokeWidth={BROW_STROKE}
              strokeLinecap="round"
            />
          ))}
          <path
            d={mouth.d}
            fill={INK}
            stroke={INK}
            strokeWidth={MOUTH.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g clipPath={`url(#${id}-mouth)`}>
            <ellipse
              cx={MOUTH.cx}
              cy={mouth.tongueY}
              rx="15"
              ry="9"
              fill="#ff7a93"
              opacity={mouth.tongueOpacity}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BROWS,
  BROW_STROKE,
  CHEEKS,
  DEFAULT_DISPLAY_SIZE,
  EYES,
  EYE_AREA_SCALE,
  IMAGE_QUALITY,
  IMAGE_SIZE,
  INK,
  MOUTH,
  SLEEP_Z,
  SLEEP_Z_COLOR,
  imageSet,
  mascotBase,
  mascotClosedEyes,
  pct,
  round,
} from './art';
import { EXPRESSIONS, browShape, closedAmount, mouthShape, type Expression } from './face';
import { IDLE } from './gaze';
import { useMascot } from './use-mascot';

type MascotProps = {
  className?: string;
  /** Expressão de repouso (ex.: preocupado numa página de erro). */
  expression?: Expression | undefined;
  /** Maior tamanho em que ele aparece na tela (px), pra baixar a arte na medida certa. */
  displaySize?: number | undefined;
  /** É o maior elemento da tela (ex.: o login): a arte é pedida antes de tudo. */
  preload?: boolean;
};

/**
 * Mascote que acompanha o que a pessoa faz na tela: segue o mouse, olha o texto digitado
 * (e sorri), fecha os olhos na senha (e espia com um olho ao mostrar), fecha a cara com senha
 * errada, se espanta com Caps Lock, desconfia de email digitado errado, acena quando o email
 * fica completo, ri quando tocado, cochila quando ninguém mexe e comemora quando dá certo.
 *
 * Este arquivo só desenha. O comportamento está em use-mascot.ts, e o que é específico de cada
 * tela (erro, sucesso, sugestão de email) chega pelos avisos de events.ts.
 */
export function Mascot({
  className,
  expression = 'neutral',
  displaySize = DEFAULT_DISPLAY_SIZE,
  preload = false,
}: MascotProps) {
  const closedEyesImage = useMemo(() => imageSet(mascotClosedEyes, displaySize), [displaySize]);
  const rootRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^\w-]/g, '');
  // Só o desenho de partida: depois, quem muda a expressão é o laço de animação (useMascot).
  // Recalculado a cada render, o React escreveria a expressão nova por cima do quadro que o laço
  // acabou de desenhar, e o rosto pularia por um quadro.
  const [{ base, initialMouth }] = useState(() => {
    const start = EXPRESSIONS[expression];
    return { base: start, initialMouth: mouthShape(start.mouth) };
  });

  useMascot(rootRef, faceRef, expression);

  return (
    <div
      ref={rootRef}
      data-slot="mascot"
      data-expression={expression}
      aria-hidden="true"
      // forced-color-adjust: no alto contraste do Windows, as cores das pupilas, da boca e das
      // bochechas seriam trocadas pelas do sistema (e as pupilas sumiriam). É uma ilustração
      // decorativa (aria-hidden): mantém as cores próprias, como uma imagem.
      className={cn(
        'group/mascot relative touch-manipulation [forced-color-adjust:none] select-none',
        className,
      )}
    >
      <div
        ref={faceRef}
        data-slot="mascot-face"
        className="absolute inset-0 [transform:translate(calc(var(--gx)*2px),calc(var(--gy)*1.5px))_rotate(calc(var(--gx)*4deg_+_var(--tilt)*1deg))]"
        style={
          {
            '--gx': IDLE.x,
            '--gy': IDLE.y,
            '--tilt': base.tilt,
            '--pupil': base.pupil,
            '--lid0': base.lid,
            '--lid1': base.lid,
            '--closed0': closedAmount(base.lid),
            '--closed1': closedAmount(base.lid),
          } as React.CSSProperties
        }
      >
        <Image
          src={mascotBase}
          alt=""
          fill
          sizes={`${displaySize}px`}
          quality={IMAGE_QUALITY}
          loading="eager"
          preload={preload}
          draggable={false}
          className="pointer-events-none select-none"
        />
        {EYES.map((eye, index) => {
          // Quanto a pupila pode andar, em % do próprio tamanho (unidade do translate).
          // A pupila continua limitada ao olho original (eye.rx/ry), não à área ampliada.
          const travelX = ((eye.rx - eye.pupilW / 2) / eye.pupilW) * 100;
          const travelY = ((eye.ry - eye.pupilH / 2) / eye.pupilH) * 100;
          const areaRx = eye.rx * EYE_AREA_SCALE;
          const areaRy = eye.ry * EYE_AREA_SCALE;
          return (
            <div
              key={eye.cx}
              className="absolute overflow-hidden rounded-[50%]"
              style={{
                left: pct(eye.cx - areaRx),
                top: pct(eye.cy - areaRy),
                width: pct(areaRx * 2),
                height: pct(areaRy * 2),
              }}
            >
              <div
                className="absolute top-1/2 left-1/2 rounded-[50%]"
                style={{
                  backgroundColor: INK,
                  width: `${(eye.pupilW / (areaRx * 2)) * 100}%`,
                  height: `${(eye.pupilH / (areaRy * 2)) * 100}%`,
                  transform: `translate(calc(-50% + var(--gx) * ${travelX}%), calc(-50% + var(--gy) * ${travelY}%)) scale(var(--pupil))`,
                }}
              />
              <div
                data-lid
                className="absolute inset-0 bg-no-repeat"
                style={{
                  // Pele da mesma região da arte, alinhada com o olho; desce sem esticar.
                  backgroundImage: closedEyesImage,
                  backgroundSize: `${(IMAGE_SIZE / (areaRx * 2)) * 100}% ${(IMAGE_SIZE / (areaRy * 2)) * 100}%`,
                  backgroundPosition: `${((eye.cx - areaRx) / (IMAGE_SIZE - areaRx * 2)) * 100}% ${((eye.cy - areaRy) / (IMAGE_SIZE - areaRy * 2)) * 100}%`,
                  clipPath: `inset(0 0 calc((1 - var(--lid${index})) * 100%) 0)`,
                }}
              />
            </div>
          );
        })}
        {/* Olho fechado: pele um pouco maior que o olho, que cobre também a borda clara da arte. */}
        {EYES.map((eye, index) => (
          <div
            key={eye.cx}
            className="pointer-events-none absolute inset-0 bg-size-[100%_100%] bg-no-repeat"
            style={{
              backgroundImage: closedEyesImage,
              clipPath: `ellipse(${pct(eye.rx * 1.25)} ${pct(eye.ry * 1.25)} at ${pct(eye.cx)} ${pct(eye.cy)})`,
              opacity: `var(--closed${index})`,
            }}
          />
        ))}
        <svg
          viewBox={`0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}`}
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <radialGradient id={`${id}-blush`}>
              <stop offset="0%" stopColor="#ff6f9f" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ff6f9f" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${id}-mouth`}>
              <path data-mouth-clip d={initialMouth.d} />
            </clipPath>
          </defs>
          {/* Tracinho curvo de olho fechado ("‿"). */}
          {EYES.map((eye, index) => (
            <g key={eye.cx} style={{ opacity: `var(--closed${index})` }}>
              <path
                d={`M${round(eye.cx - eye.rx * 0.72)} ${round(eye.cy + eye.ry * 0.05)} Q${eye.cx} ${round(eye.cy + eye.ry * 0.6)} ${round(eye.cx + eye.rx * 0.72)} ${round(eye.cy + eye.ry * 0.05)}`}
                fill="none"
                stroke={INK}
                strokeWidth={BROW_STROKE}
                strokeLinecap="round"
              />
            </g>
          ))}
          <g data-blush opacity={Math.max(0, base.mouth)}>
            {CHEEKS.map((cheek) => (
              <ellipse key={cheek.cx} {...cheek} fill={`url(#${id}-blush)`} />
            ))}
          </g>
          {BROWS.map((brow, index) => (
            <path
              key={brow.outer[0]}
              data-brow
              d={browShape(index, base)}
              fill="none"
              stroke={INK}
              strokeWidth={BROW_STROKE}
              strokeLinecap="round"
            />
          ))}
          <path
            data-mouth
            d={initialMouth.d}
            fill={INK}
            stroke={INK}
            strokeWidth={MOUTH.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g clipPath={`url(#${id}-mouth)`}>
            <ellipse
              data-tongue
              cx={MOUTH.cx}
              cy={initialMouth.tongueY}
              rx="15"
              ry="9"
              fill="#ff7a93"
              opacity={initialMouth.tongueOpacity}
            />
          </g>
        </svg>
      </div>
      <svg
        viewBox={`0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}`}
        className="pointer-events-none absolute inset-0 size-full overflow-visible opacity-0 transition-opacity duration-500 group-data-[expression=asleep]/mascot:opacity-100"
      >
        {SLEEP_Z.map((z) => (
          <text
            key={z.x}
            x={z.x}
            y={z.y}
            fontSize={z.size}
            fontWeight={800}
            fill={SLEEP_Z_COLOR}
            // Só anima enquanto ele dorme (e recomeça a cada cochilo); termina em ~2,2s, contando
            // o atraso, e fica parado. Cresce a partir da própria base (canto de baixo à esquerda).
            className="[transform-origin:left_bottom] [transform-box:fill-box] motion-safe:group-data-[expression=asleep]/mascot:animate-[mascot-zzz_1.2s_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ animationDelay: `${z.delay}s` }}
          >
            Z
          </text>
        ))}
      </svg>
    </div>
  );
}

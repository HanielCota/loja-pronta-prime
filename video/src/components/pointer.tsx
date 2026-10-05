import { useCurrentFrame } from 'remotion';
import { keyed, ramp } from '../motion';
import { useLayout } from '../layout';

/**
 * Quem "usa" o app na cena: a seta do mouse no computador ou o toque do dedo no celular. Anda
 * por mola entre os pontos marcados (coordenadas da tela do app) e, em cada toque, afunda um
 * pouquinho e deixa uma onda, como o retorno de toque do sistema.
 */
export type PointerPath = readonly { at: number; x: number; y: number }[];

export function Pointer({ path, taps }: { path: PointerPath; taps: readonly number[] }) {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const first = path[0];
  if (!first) return null;
  const x = keyed(
    frame,
    path.map((point) => ({ at: point.at, value: point.x })),
  );
  const y = keyed(
    frame,
    path.map((point) => ({ at: point.at, value: point.y })),
  );
  const press = taps.reduce((amount, at) => {
    const t = frame - at;
    return t >= -3 && t < 8 ? Math.max(amount, t < 0 ? (t + 3) / 3 : 1 - t / 8) : amount;
  }, 0);
  const ripples = taps.filter((at) => frame >= at && frame < at + 18);

  if (portrait) {
    // No celular não há seta: só o dedo encostando (um círculo que aparece no toque).
    return (
      <>
        {taps.map((at) => {
          const t = frame - at;
          if (t < -4 || t > 14) return null;
          const tapX = keyed(
            at,
            path.map((point) => ({ at: point.at, value: point.x })),
          );
          const tapY = keyed(
            at,
            path.map((point) => ({ at: point.at, value: point.y })),
          );
          const appear = ramp(frame, at - 4, at);
          const leave = ramp(frame, at + 4, at + 14);
          return (
            <div
              key={at}
              className="pointer-events-none absolute rounded-full border-2 border-foreground/25 bg-foreground/15"
              style={{
                left: tapX - 22,
                top: tapY - 22,
                width: 44,
                height: 44,
                opacity: appear * (1 - leave),
                transform: `scale(${0.7 + 0.3 * appear + 0.5 * leave})`,
              }}
            />
          );
        })}
      </>
    );
  }

  const visible = ramp(frame, first.at - 6, first.at + 4);
  return (
    <>
      {ripples.map((at) => {
        const t = ramp(frame, at, at + 18);
        return (
          <div
            key={at}
            className="pointer-events-none absolute rounded-full border-2 border-primary"
            style={{
              left: x - 24,
              top: y - 24,
              width: 48,
              height: 48,
              opacity: (1 - t) * 0.6,
              transform: `scale(${0.4 + t})`,
            }}
          />
        );
      })}
      <svg
        width="26"
        height="34"
        viewBox="0 0 26 34"
        className="pointer-events-none absolute drop-shadow-sm"
        style={{
          left: x - 3,
          top: y - 2,
          opacity: visible,
          transform: `scale(${1 - press * 0.14})`,
          transformOrigin: '3px 2px',
        }}
        aria-hidden="true"
      >
        {/* A seta do sistema: preta com contorno branco. */}
        <path
          d="M3 2 L3 27 L9.5 21 L14 31 L18.5 29 L14 19.5 L22.5 19.5 Z"
          fill="#111"
          stroke="#fff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}

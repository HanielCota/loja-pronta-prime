import { Easing, interpolate, spring } from 'remotion';
import { FPS } from './timeline';

/**
 * O jeito de mexer do vídeo, o mesmo da interface: molas sem quique exagerado e saídas rápidas
 * (a curva "ease out" da Apple). Tudo em quadros.
 */

export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Mola de 0 a 1 a partir de `start`. `bounce`: um pouquinho de quique (o mascote, os toques). */
export function pop(
  frame: number,
  start: number,
  { bounce = false, duration }: { bounce?: boolean; duration?: number } = {},
) {
  return spring({
    frame: frame - start,
    fps: FPS,
    config: bounce ? { damping: 13, stiffness: 180, mass: 0.8 } : { damping: 200, stiffness: 150 },
    ...(duration ? { durationInFrames: duration } : {}),
  });
}

/** De 0 a 1 entre dois quadros, com a curva de saída. */
export function ramp(frame: number, from: number, to: number, easing = easeOut) {
  return interpolate(frame, [from, to], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Mistura de a até b. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Valor que muda em momentos marcados, sempre por mola: `keys` em ordem de quadro. Serve pra
 * expressão do mascote, pra onde ele olha, pra posição do cursor.
 */
export function keyed(
  frame: number,
  keys: readonly { at: number; value: number }[],
  bounce = false,
) {
  if (keys.length === 0) return 0;
  let value = keys[0]!.value;
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i]!;
    if (frame < key.at) break;
    value = lerp(value, key.value, pop(frame, key.at, { bounce }));
  }
  return value;
}

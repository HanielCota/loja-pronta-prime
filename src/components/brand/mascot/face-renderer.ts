import { BROWS } from './art';
import { browShape, closedAmount, mouthShape, type FaceState } from './face';
import type { Gaze } from './gaze';

/**
 * Escreve o estado animado no desenho a cada quadro: variáveis CSS (olhar, pálpebras, pupila,
 * inclinação) e os caminhos do SVG (boca, língua, bochechas, sobrancelhas). Sem React no meio:
 * a 60 quadros por segundo, re-renderizar o componente seria caro.
 */
export function createFaceRenderer(face: HTMLElement) {
  const mouth = face.querySelector('[data-mouth]');
  const mouthClip = face.querySelector('[data-mouth-clip]');
  const tongue = face.querySelector('[data-tongue]');
  const blush = face.querySelector('[data-blush]');
  const brows = [...face.querySelectorAll('[data-brow]')];
  const lids = [...face.querySelectorAll<HTMLElement>('[data-lid]')];
  if (!mouth || !mouthClip || !tongue || !blush || brows.length !== BROWS.length) return null;

  return {
    /** As pálpebras (pra animação de piscar). */
    lids,
    render(gaze: Gaze, state: FaceState) {
      face.style.setProperty('--gx', gaze.x.toFixed(3));
      face.style.setProperty('--gy', gaze.y.toFixed(3));
      face.style.setProperty('--tilt', state.tilt.toFixed(2));
      face.style.setProperty('--pupil', state.pupil.toFixed(3));
      face.style.setProperty('--lid0', Math.max(0, state.lid0).toFixed(3));
      face.style.setProperty('--lid1', Math.max(0, state.lid1).toFixed(3));
      face.style.setProperty('--closed0', closedAmount(state.lid0).toFixed(3));
      face.style.setProperty('--closed1', closedAmount(state.lid1).toFixed(3));
      const shape = mouthShape(state.mouth);
      mouth.setAttribute('d', shape.d);
      mouthClip.setAttribute('d', shape.d);
      tongue.setAttribute('cy', String(shape.tongueY));
      tongue.setAttribute('opacity', shape.tongueOpacity.toFixed(2));
      blush.setAttribute('opacity', Math.max(0, state.mouth).toFixed(2));
      brows.forEach((element, index) => element.setAttribute('d', browShape(index, state)));
    },
  };
}

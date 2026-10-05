/**
 * O acento de edição que ficou na versão narrada: um zoom leve e rápido nos toques (a câmera
 * "acompanha" o dedo), que volta em poucos quadros.
 */
const decay = (t: number, length: number) => (t < 0 || t >= length ? 0 : (1 - t / length) ** 2);

/** O zoom no instante de cada toque (`hits`, em quadros), somado a 1. */
export function punch(frame: number, hits: readonly number[], amount = 0.012, length = 12): number {
  return hits.reduce((scale, at) => scale + decay(frame - at, length) * amount, 1);
}

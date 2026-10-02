import { BROWS, MOUTH, round } from './art';

/**
 * Expressões do rosto e como desenhá-las. Funções puras: recebem os números e devolvem o desenho.
 *
 * Traços do rosto, cada um animado por mola até o valor da expressão:
 * - mouth: -1 triste, 0 a arte original, 1 sorriso aberto
 * - brow: -1 franzida (pontas de dentro pra baixo), 1 preocupada (pontas de dentro pra cima)
 * - raise: sobe (1) ou desce (-1) as sobrancelhas
 * - skew: levanta uma sobrancelha só (desconfiado)
 * - tilt: inclina a cabeça (graus)
 * - pupil: tamanho da pupila (menor = olhos arregalados)
 * - lid: quanto as pálpebras ficam fechadas (0 abertas, 1 fechadas)
 */
export const EXPRESSIONS = {
  neutral: { mouth: 0, brow: 0, raise: 0, skew: 0, tilt: 0, pupil: 1, lid: 0 },
  happy: { mouth: 1, brow: 0, raise: 0.6, skew: 0, tilt: 0, pupil: 1, lid: 0 },
  celebrate: { mouth: 1, brow: 0, raise: 1, skew: 0, tilt: 0, pupil: 1.05, lid: 0 },
  grumpy: { mouth: -0.55, brow: -1, raise: -0.6, skew: 0, tilt: 0, pupil: 1, lid: 0.42 },
  worried: { mouth: -1, brow: 1, raise: 0.3, skew: 0, tilt: 0, pupil: 1, lid: 0.1 },
  surprised: { mouth: 0, brow: 0, raise: 1, skew: 0, tilt: 0, pupil: 0.68, lid: 0 },
  skeptical: { mouth: -0.25, brow: 0, raise: 0, skew: 1, tilt: -7, pupil: 1, lid: 0.18 },
  sleepy: { mouth: 0, brow: 0, raise: -0.3, skew: 0, tilt: 3, pupil: 1, lid: 0.6 },
  asleep: { mouth: 0, brow: 0, raise: -0.3, skew: 0, tilt: 5, pupil: 1, lid: 1 },
} as const;

export type Expression = keyof typeof EXPRESSIONS;
export type Face = { -readonly [K in keyof (typeof EXPRESSIONS)['neutral']]: number };
/** Estado animado: como Face, mas com uma pálpebra por olho (pra espiar com um olho só). */
export type FaceState = Omit<Face, 'lid'> & { lid0: number; lid1: number };

/** Quando duas reações acontecem juntas, a que vem primeiro nesta lista aparece. */
export const PRIORITY: readonly Expression[] = [
  'celebrate',
  'grumpy',
  'worried',
  'surprised',
  'skeptical',
  'happy',
  'asleep',
  'sleepy',
];

/** A partir de quanto a pálpebra conta como "olho fechado" (cobre a borda e mostra o "‿"). */
const CLOSED_FROM = 0.75;
const BROW_TILT_DEG = { grumpy: 22, worried: 28 } as const;
const BROW_MAX_LIFT = 8;

/** Quanto do olho fechado aparece: 0 até CLOSED_FROM, 1 com a pálpebra toda fechada. */
export const closedAmount = (lid: number) =>
  Math.min(1, Math.max(0, (lid - CLOSED_FROM) / (1 - CLOSED_FROM)));

/** Expressão com uma pálpebra por olho; `lids` substitui a da expressão (ex.: senha). */
export function toFaceState({ lid, ...face }: Face, lids?: readonly [number, number]): FaceState {
  return { ...face, lid0: lids?.[0] ?? lid, lid1: lids?.[1] ?? lid };
}

/**
 * Boca pelo humor: -1 triste, 0 a arte original, 1 sorriso aberto.
 * É um caminho fechado (lábio de cima + lábio de baixo); no humor 0 os dois coincidem
 * e sobra só o traço, então a transição pro sorriso aberto é contínua.
 */
export function mouthShape(mood: number) {
  const happy = Math.max(0, mood);
  const sad = Math.max(0, -mood);
  const x0 = MOUTH.x0 - 10 * happy + 3 * sad;
  const x2 = MOUTH.x2 + 10 * happy - 3 * sad;
  const y0 = MOUTH.y0 - 6 * happy + 6 * sad;
  const y2 = MOUTH.y2 - 6 * happy + 6 * sad;
  const topY = MOUTH.cy - 12 * happy - 18 * sad;
  const bottomY = MOUTH.cy + 22 * happy - 18 * sad;
  const d =
    `M${round(x0)} ${round(y0)} Q${MOUTH.cx} ${round(topY)} ${round(x2)} ${round(y2)} ` +
    `Q${MOUTH.cx} ${round(bottomY)} ${round(x0)} ${round(y0)}Z`;
  // Ponto mais baixo do lábio de baixo (meio da curva), onde fica a língua.
  const lowestY = (y0 + 2 * bottomY + y2) / 4;
  return {
    d,
    tongueY: round(lowestY - 6),
    tongueOpacity: Math.min(1, Math.max(0, (happy - 0.25) / 0.6)),
  };
}

/**
 * Sobrancelha pela expressão. Em vez de girar a arte (cada sobrancelha nasce com uma inclinação),
 * interpola até uma pose desenhada: franzida = ponta de dentro abaixo da de fora, formando o "V";
 * preocupada = ponta de dentro acima. Em brow = 0 é exatamente a arte original.
 * `skew` sobe a sobrancelha da direita e baixa um pouco a da esquerda (desconfiado).
 */
export function browShape(index: number, face: Pick<Face, 'brow' | 'raise' | 'skew'>) {
  const brow = BROWS[index]!;
  const [outerX, outerY] = brow.outer;
  const [innerX, innerY] = brow.inner;
  const [controlX, controlY] = brow.control;
  const width = Math.abs(innerX - outerX);
  const amount = Math.min(1, Math.abs(face.brow));
  const tilt = face.brow < 0 ? BROW_TILT_DEG.grumpy : -BROW_TILT_DEG.worried;
  const poseInnerY = outerY + Math.tan((tilt * Math.PI) / 180) * width;
  // Na pose, a curva fica quase reta (controle no meio do traço, levemente acima).
  const poseControlY = (outerY + poseInnerY) / 2 - 2;
  const skewLift = index === 1 ? face.skew : -face.skew * 0.5;
  const lift = -(face.raise + skewLift) * BROW_MAX_LIFT;
  const lerp = (from: number, to: number) => from + (to - from) * amount;
  const iy = lerp(innerY, poseInnerY) + lift;
  const cx = lerp(controlX, (outerX + innerX) / 2);
  const cy = lerp(controlY, poseControlY) + lift;
  return `M${outerX} ${round(outerY + lift)} Q${round(cx)} ${round(cy)} ${innerX} ${round(iy)}`;
}

import { getImageProps, type StaticImageData } from 'next/image';
// Importadas (e não servidas de public/): o endereço leva um hash do conteúdo, então qualquer
// mudança na arte invalida os caches (navegador, CDN e otimizador de imagens) sozinha.
import mascotArms from './assets/mascote-bracos-relaxados.png';
import mascotBody from './assets/mascote-corpo.png';
import mascotClosedEyes from './assets/mascote-olhos-fechados.png';
// O mascote inteiro, com o rosto desenhado na própria imagem: pros lugares pequenos e parados
// (a barra do topo, o chat), onde o rosto animado não faz falta.
import mascotStill from './assets/mascote-rosto.png';

/** A arte e as medidas do desenho: o que muda junto quando a arte do mascote muda. */

export { mascotArms, mascotBody, mascotClosedEyes, mascotStill };

export const IMAGE_SIZE = 512;
/**
 * As artes da Lupita têm 1254px (cerca de 2,45x das medidas abaixo). O Next entrega na medida da tela
 * (displaySize; o padrão é o size-33 do Logo) e com qualidade máxima (liberada no next.config).
 */
export const DEFAULT_DISPLAY_SIZE = 132;
export const IMAGE_QUALITY = 100;

/**
 * Medidas em assets/mascote-base.png (a arte sem pupilas, boca e sobrancelhas), em
 * pixels da imagem de 512px. Se a arte do mascote mudar, estas medidas precisam ser refeitas.
 */
export const EYES = [
  { cx: 213, cy: 249.5, rx: 27, ry: 30, pupilW: 34, pupilH: 49 },
  { cx: 316, cy: 219, rx: 24, ry: 29, pupilW: 31, pupilH: 46 },
] as const;
/** Boca de repouso: curva das pontas (P0, P2) com controle C. */
export const MOUTH = { x0: 256, y0: 256, cx: 274, cy: 262, x2: 289, y2: 249, stroke: 7 } as const;
/** Sobrancelhas originais: ponta de fora, controle da curva e ponta de dentro (perto do nariz). */
export const BROWS = [
  { outer: [190, 204], control: [199, 190], inner: [210, 190] },
  { outer: [309, 166], control: [298, 158], inner: [287, 166] },
] as const;
export const BROW_STROKE = 6;
export const CHEEKS = [
  { cx: 201, cy: 290, rx: 18, ry: 14 },
  { cx: 346, cy: 249, rx: 16, ry: 13 },
] as const;
/**
 * "Zzz" quando ele dorme: três Z maiúsculos crescendo na diagonal, à direita da cabeça e fora
 * da silhueta, acima das estrelas. x e y são a base de cada letra.
 */
export const SLEEP_Z = [
  { x: 364, y: 112, size: 40, delay: 0 },
  { x: 405, y: 80, size: 48, delay: 0.5 },
  { x: 450, y: 44, size: 56, delay: 1 },
] as const;
/**
 * A área do olho (onde a pupila anda e a pálpebra desce) é um pouco maior que o branco medido,
 * pra pálpebra cobrir também a borda suavizada da arte enquanto fecha.
 */
export const EYE_AREA_SCALE = 1.08;
export const INK = '#38171d';

/** Arte desenhada em repouso: mão arredondada e braço curto, articulado pelo próprio ombro. */
export const ARMS = {
  left: {
    origin: '30% 60%',
    rest: '0deg',
    direction: -1,
    offset: '0 5%',
    scale: 0.8,
    // A arte já tem a pose relaxada: só o balanço pequeno gira a mão pelo ombro.
    clip: 'inset(0 50% 0 0)',
  },
  right: {
    origin: '70% 58%',
    rest: '0deg',
    direction: 1,
    offset: '0 4%',
    scale: 0.8,
    // Este braço nasce atrás da lateral do corpo e da alça.
    clip: 'inset(0 0 0 50%)',
  },
} as const;

export const pct = (value: number) => `${(value / IMAGE_SIZE) * 100}%`;
export const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Imagem otimizada pra usar em CSS, na densidade da tela (1x/2x), como o <Image> faz. Usada na
 * arte com os olhos cobertos de pele (mascote-olhos-fechados.png): as pálpebras mostram essa pele,
 * então fechar o olho não deixa emenda nem borda clara.
 */
export function imageSet(src: StaticImageData, size: number) {
  const { srcSet = '' } = getImageProps({
    src,
    alt: '',
    width: size,
    height: size,
    quality: IMAGE_QUALITY,
  }).props;
  const options = srcSet.split(', ').map((entry) => {
    const [url, density] = entry.split(' ');
    return `url("${url}") ${density}`;
  });
  return `image-set(${options.join(', ')})`;
}

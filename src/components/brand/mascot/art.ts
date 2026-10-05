import { getImageProps, type StaticImageData } from 'next/image';
// Importadas (e não servidas de public/): o endereço leva um hash do conteúdo, então qualquer
// mudança na arte invalida os caches (navegador, CDN e otimizador de imagens) sozinha.
import mascotBase from './assets/mascote-base.png';
import mascotClosedEyes from './assets/mascote-olhos-fechados.png';
// O mascote inteiro, com o rosto desenhado na própria imagem: pros lugares pequenos e parados
// (a barra do topo, o chat), onde o rosto animado não faz falta.
import mascotStill from './assets/mascote-rosto.png';

/** A arte e as medidas do desenho: o que muda junto quando a arte do mascote muda. */

export { mascotBase, mascotClosedEyes, mascotStill };

export const IMAGE_SIZE = 512;
/**
 * As artes têm 1024px (2x das medidas abaixo). O otimizador do Next entrega na medida da tela
 * (displaySize; o padrão é o size-33 do Logo) e com qualidade máxima (liberada no next.config).
 */
export const DEFAULT_DISPLAY_SIZE = 132;
export const IMAGE_QUALITY = 100;

/**
 * Medidas em assets/mascote-base.png (a arte sem pupilas, boca e sobrancelhas), em
 * pixels da imagem de 512px. Se a arte do mascote mudar, estas medidas precisam ser refeitas.
 */
export const EYES = [
  { cx: 241, cy: 290, rx: 34, ry: 37, pupilW: 33, pupilH: 50 },
  { cx: 353, cy: 265.5, rx: 28, ry: 34.5, pupilW: 28, pupilH: 47 },
] as const;
/** Boca original: curva das pontas (P0, P2) com controle C, traço de 9px. */
export const MOUTH = { x0: 294, y0: 320, cx: 307, cy: 330, x2: 323, y2: 315.5, stroke: 9 } as const;
/** Sobrancelhas originais: ponta de fora, controle da curva e ponta de dentro (perto do nariz). */
export const BROWS = [
  { outer: [209.5, 235], control: [223, 223], inner: [236, 224.5] },
  { outer: [358, 203.5], control: [345, 198], inner: [333, 204] },
] as const;
export const BROW_STROKE = 9;
export const CHEEKS = [
  { cx: 218, cy: 348, rx: 30, ry: 16 },
  { cx: 376, cy: 320, rx: 26, ry: 15 },
] as const;
/**
 * "Zzz" quando ele dorme: três Z maiúsculos crescendo na diagonal, à direita da cabeça e fora
 * da silhueta (a cabeça vai até x≈382 entre y=100 e 160; o topo começa em y=32). x e y são a
 * base de cada letra; o último passa um pouco da borda da arte, de propósito.
 */
export const SLEEP_Z = [
  { x: 398, y: 152, size: 64, delay: 0 },
  { x: 438, y: 98, size: 84, delay: 0.5 },
  { x: 486, y: 34, size: 108, delay: 1 },
] as const;
/**
 * A área do olho (onde a pupila anda e a pálpebra desce) é um pouco maior que o branco medido,
 * pra pálpebra cobrir também a borda suavizada da arte enquanto fecha.
 */
export const EYE_AREA_SCALE = 1.08;
export const INK = '#0b0d17';

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

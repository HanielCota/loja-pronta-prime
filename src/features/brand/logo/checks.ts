import { backdropColor, elementLabel, replaceElement, scaleElement, type Size } from './editor';
import { contrast } from './palette';
import { SCENE_SIZE, type LogoScene, type SceneElement, type TextElement } from './scene';

/**
 * A conferência antes de seguir: o que deixaria o logo ruim de ver na Shopee, cada problema com um
 * conserto de um toque. Funções puras (a tela só mostra e aplica).
 */

const CENTER = SCENE_SIZE / 2;
const WHITE = '#ffffff';
const BLACK = '#1d1d1f';

/** Na lista de lojas, a Shopee mostra o logo com 64px: as letras do nome precisam aparecer. */
export const LIST_SIZE = 64;

/** Altura mínima (em px, na lista de lojas) de uma linha do nome pra dar pra ler. */
const MIN_LINE_PX = 4;

/** A mesma altura em unidades do logo (que tem 1000 de lado). */
export const MIN_LINE_HEIGHT = (MIN_LINE_PX * SCENE_SIZE) / LIST_SIZE;

/** Contraste mínimo pra texto grande e desenhos (WCAG): abaixo disso, some de longe. */
const MIN_CONTRAST = 3;

/** Folga, em unidades do logo, pra uma ponta encostando na borda do círculo não contar. */
const CIRCLE_TOLERANCE = 6;

export type LogoIssue = {
  /** Único na lista (o tipo e a parte). */
  id: string;
  /** O que está errado, numa frase curta. */
  message: string;
  /** O conserto de um toque: o nome do botão e o logo consertado. Sem ele, é só um aviso. */
  fix?: { label: string; apply: (scene: LogoScene) => LogoScene };
};

/** As quatro pontas do elemento já girado, no logo. */
function corners(element: SceneElement, size: Size) {
  const radians = (element.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => {
    const dx = (sx! * size.width) / 2;
    const dy = (sy! * size.height) / 2;
    return { x: element.x + dx * cos - dy * sin, y: element.y + dx * sin + dy * cos };
  });
}

/** O elemento cabe inteiro no círculo em que a Shopee mostra o logo. */
export function insideCircle(element: SceneElement, size: Size): boolean {
  return corners(element, size).every(
    (corner) => Math.hypot(corner.x - CENTER, corner.y - CENTER) <= CENTER + CIRCLE_TOLERANCE,
  );
}

/**
 * O elemento trazido pra dentro do círculo: primeiro anda em direção ao meio; se nem no meio ele
 * cabe (é grande demais), diminui até caber.
 */
export function bringInside(element: SceneElement, size: Size): SceneElement {
  for (let step = 1; step <= 20; step++) {
    const t = step / 20;
    const moved = {
      ...element,
      x: Math.round(element.x + (CENTER - element.x) * t),
      y: Math.round(element.y + (CENTER - element.y) * t),
    };
    if (insideCircle(moved, size)) return moved;
  }
  let factor = 1;
  let centered: SceneElement = { ...element, x: CENTER, y: CENTER };
  while (factor > 0.2) {
    factor *= 0.95;
    centered = scaleElement({ ...element, x: CENTER, y: CENTER }, factor);
    const scaled = { width: size.width * factor, height: size.height * factor };
    if (insideCircle(centered, scaled)) return centered;
  }
  return centered;
}

/** A cor (branco ou quase preto) que mais aparece em cima de `backdrop`. */
export function readableOn(backdrop: string): string {
  return contrast(WHITE, backdrop) >= contrast(BLACK, backdrop) ? WHITE : BLACK;
}

/** Mede um elemento como ele sai desenhado (o editor mede com as letras carregadas). */
export type Measure = (element: SceneElement) => Size;

/**
 * Os problemas do logo, do mais grave pro menos: sem o nome, partes cortadas pelo círculo, partes
 * difíceis de ver e o nome pequeno demais.
 */
export function checkLogo(scene: LogoScene, measure: Measure): LogoIssue[] {
  const issues: LogoIssue[] = [];
  const sizes = new Map(scene.elements.map((element) => [element.id, measure(element)]));
  const name = scene.elements.find(
    (element) => element.type === 'text' && element.source === 'name',
  );

  if (!name) {
    issues.push({
      id: 'sem-nome',
      message: 'O nome da loja não está no logo.',
      fix: { label: 'Pôr o nome', apply: addName },
    });
  }

  for (const element of scene.elements) {
    // Formas são enfeite (um anel, uma faixa): podem passar da borda de propósito.
    if (element.type === 'shape') continue;
    const size = sizes.get(element.id);
    if (!size || insideCircle(element, size)) continue;
    issues.push({
      id: `fora-${element.id}`,
      message: `${elementLabel(element)}: um pedaço fica cortado no círculo da Shopee.`,
      fix: {
        label: 'Trazer pra dentro',
        apply: (current) => {
          const target = current.elements.find((item) => item.id === element.id);
          return target ? replaceElement(current, bringInside(target, size)) : current;
        },
      },
    });
  }

  for (const element of scene.elements) {
    // Formas são enfeite; figurinhas têm as próprias cores (várias, de propósito).
    if (element.type === 'shape' || element.type === 'sticker') continue;
    const backdrop = backdropColor(scene, element.id, sizes);
    if (contrast(element.color, backdrop) >= MIN_CONTRAST) continue;
    const color = readableOn(backdrop);
    issues.push({
      id: `contraste-${element.id}`,
      message: `${elementLabel(element)}: a cor quase some no fundo.`,
      fix: {
        label: color === WHITE ? 'Usar branco' : 'Usar preto',
        apply: (current) => {
          const target = current.elements.find((item) => item.id === element.id);
          return target ? replaceElement(current, { ...target, color } as SceneElement) : current;
        },
      },
    });
  }

  if (name?.type === 'text') {
    const size = sizes.get(name.id);
    const line = size ? lineHeight(name, size) : Infinity;
    if (line < MIN_LINE_HEIGHT) {
      const enlarged = enlargeName(name, measure);
      // Uma palavra só, comprida demais: não tem como crescer. Fica o aviso, sem botão.
      const helps = lineHeight(enlarged, measure(enlarged)) > line * 1.1;
      issues.push({
        id: 'nome-pequeno',
        message: helps
          ? 'O nome fica pequeno demais pra ler na lista de lojas.'
          : 'O nome é comprido: na lista de lojas, fica difícil de ler. Um nome mais curto ajuda.',
        ...(helps && {
          fix: {
            label: 'Aumentar o nome',
            apply: (current: LogoScene) => replaceElement(current, enlarged),
          },
        }),
      });
    }
  }

  return issues;
}

/** A altura de uma linha do texto, no logo. */
function lineHeight(text: TextElement, size: Size): number {
  return size.height / text.lines;
}

/**
 * O nome grande o bastante pra ler na lista de lojas, sem sair do círculo. Um nome comprido não
 * cresce numa linha só (bate na largura): aí ele é dividido em mais linhas, que deixam a letra
 * maior. Fica a primeira forma que dá pra ler, ou a mais legível de todas.
 */
export function enlargeName(text: TextElement, measure: Measure): TextElement {
  const goal = MIN_LINE_HEIGHT * 1.15;
  let best = text;
  let bestLine = lineHeight(text, measure(text));
  for (let lines = text.lines; lines <= 3; lines++) {
    // Pede uma letra bem maior: o desenho diminui o que for preciso pra caber na largura.
    let candidate: TextElement = { ...text, lines, size: Math.min(600, text.size * 3) };
    let size = measure(candidate);
    const line = lineHeight(candidate, size);
    // Só o necessário: grande demais também atrapalha.
    if (line > goal) {
      candidate = { ...candidate, size: Math.max(12, (candidate.size * goal) / line) };
      size = measure(candidate);
    }
    if (!insideCircle(candidate, size)) {
      candidate = bringInside(candidate, size) as TextElement;
      size = measure(candidate);
    }
    const result = lineHeight(candidate, size);
    if (result >= MIN_LINE_HEIGHT) return candidate;
    if (result > bestLine) {
      best = candidate;
      bestLine = result;
    }
  }
  return best;
}

/** O nome da loja de volta, embaixo do meio, na letra e na cor dos outros textos. */
function addName(scene: LogoScene): LogoScene {
  const text = scene.elements.find((element) => element.type === 'text');
  const color = text?.color ?? readableOn(scene.background);
  const font = text?.type === 'text' ? text.font : 'simples';
  const taken = new Set(scene.elements.map((element) => element.id));
  let index = 1;
  while (taken.has(`e${index}`)) index++;
  const element: SceneElement = {
    id: `e${index}`,
    type: 'text',
    source: 'name',
    font,
    color,
    size: 130,
    maxWidth: 760,
    lines: 1,
    align: 'center',
    x: CENTER,
    y: 640,
    rotation: 0,
    opacity: 1,
  };
  return { ...scene, elements: [...scene.elements, element] };
}

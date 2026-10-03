import { LOGO_ICONS } from './icons';
import {
  MAX_ELEMENTS,
  SCENE_SIZE,
  type LogoScene,
  type SceneElement,
  type TextElement,
} from './scene';
import { textContent, type LogoFonts } from './scene-render';
import { drawText } from './text';

/**
 * As regras do editor livre, sem tela: o tamanho de cada elemento, mover com encaixe, mudar de
 * tamanho, girar, alinhar, camadas e o histórico (desfazer e refazer). A tela só chama estas
 * funções; assim as regras ficam testadas e iguais pro mouse e pro teclado.
 */

const CENTER = SCENE_SIZE / 2;

/** Quão perto (em unidades da tela do logo) o centro precisa chegar pra encaixar no meio. */
export const SNAP_DISTANCE = 12;

/** Quanto as setas movem: um passo, e com Shift um passo grande. */
export const NUDGE = 5;
export const NUDGE_LARGE = 25;

export type Size = { width: number; height: number };

/** Largura e altura do elemento antes de girar (o centro é o x e y dele). */
export function elementSize(element: SceneElement, name: string, fonts: LogoFonts): Size {
  switch (element.type) {
    case 'text': {
      const { box } = drawText(fonts[element.font], textContent(element, name), element);
      return { width: box.x2 - box.x1, height: box.y2 - box.y1 };
    }
    case 'icon':
      return { width: element.size, height: element.size };
    case 'shape':
      return { width: element.width, height: element.height };
  }
}

/** Metade da largura e da altura da caixa que contém o elemento já girado. */
export function rotatedHalfExtents(size: Size, rotation: number): Size {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    width: (size.width * cos + size.height * sin) / 2,
    height: (size.width * sin + size.height * cos) / 2,
  };
}

/** Como o elemento aparece na lista de camadas e pro leitor de tela. */
export function elementLabel(element: SceneElement): string {
  switch (element.type) {
    case 'text':
      if (element.source === 'name') return 'Nome da loja';
      if (element.source === 'initial') return 'Inicial do nome';
      return `Texto: ${element.value ?? ''}`;
    case 'icon':
      return `Desenho: ${LOGO_ICONS.find((icon) => icon.id === element.icon)?.label ?? ''}`;
    case 'shape':
      return { circle: 'Círculo', ring: 'Anel', rect: 'Retângulo' }[element.shape];
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

/** O centro fica sempre dentro da tela: nada some de vez pra fora do logo. */
function clampCenter(value: number): number {
  return round(clamp(value, 0, SCENE_SIZE));
}

/**
 * O centro levado pra (x, y), encaixando no meio da tela quando chega perto. Devolve as guias que
 * acenderam (pra tela desenhar as linhas do meio).
 */
export function snapCenter(
  x: number,
  y: number,
): { x: number; y: number; guides: { vertical: boolean; horizontal: boolean } } {
  const vertical = Math.abs(x - CENTER) <= SNAP_DISTANCE;
  const horizontal = Math.abs(y - CENTER) <= SNAP_DISTANCE;
  return {
    x: vertical ? CENTER : clampCenter(x),
    y: horizontal ? CENTER : clampCenter(y),
    guides: { vertical, horizontal },
  };
}

/** O elemento com tudo o que tem tamanho multiplicado por `factor`, dentro dos limites. */
export function scaleElement(element: SceneElement, factor: number): SceneElement {
  const length = (value: number) => round(clamp(value * factor, 8, SCENE_SIZE * 1.5));
  switch (element.type) {
    case 'text':
      return {
        ...element,
        size: round(clamp(element.size * factor, 12, 600)),
        maxWidth: length(element.maxWidth),
      };
    case 'icon':
      return { ...element, size: length(element.size) };
    case 'shape':
      return {
        ...element,
        width: length(element.width),
        height: length(element.height),
        ...(element.radius === undefined
          ? {}
          : { radius: round(clamp(element.radius * factor, 0, SCENE_SIZE)) }),
        ...(element.stroke === undefined
          ? {}
          : { stroke: round(clamp(element.stroke * factor, 1, 120)) }),
      };
  }
}

/** O tamanho principal do elemento, o que o controle "Tamanho" mostra e muda. */
export function primarySize(element: SceneElement): number {
  if (element.type === 'text') return element.size;
  if (element.type === 'icon') return element.size;
  return element.width;
}

/** O elemento com o tamanho principal em `value` (o resto acompanha na mesma proporção). */
export function withPrimarySize(element: SceneElement, value: number): SceneElement {
  const current = primarySize(element);
  return current > 0 ? scaleElement(element, value / current) : element;
}

/**
 * Ângulo entre o centro e o ponteiro, em graus, com o "pra cima" valendo 0 (a alça de girar fica
 * em cima). Perto de um ângulo reto (ou de 15 em 15, com `fine`), encaixa.
 */
export function rotationFromPointer(
  center: { x: number; y: number },
  pointer: { x: number; y: number },
  fine = false,
): number {
  const raw = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI + 90;
  const normalized = ((((raw + 180) % 360) + 360) % 360) - 180;
  const step = fine ? 15 : 90;
  const nearest = Math.round(normalized / step) * step;
  const snapped = fine || Math.abs(normalized - nearest) <= 4 ? nearest : normalized;
  return round(snapped === -180 ? 180 : snapped);
}

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/** O elemento encostado numa borda da tela (ou no meio), contando o quanto ele ocupa girado. */
export function alignElement(
  element: SceneElement,
  size: Size,
  alignment: Alignment,
): SceneElement {
  const half = rotatedHalfExtents(size, element.rotation);
  switch (alignment) {
    case 'left':
      return { ...element, x: clampCenter(half.width) };
    case 'center':
      return { ...element, x: CENTER };
    case 'right':
      return { ...element, x: clampCenter(SCENE_SIZE - half.width) };
    case 'top':
      return { ...element, y: clampCenter(half.height) };
    case 'middle':
      return { ...element, y: CENTER };
    case 'bottom':
      return { ...element, y: clampCenter(SCENE_SIZE - half.height) };
  }
}

/** Um id que ainda não existe na cena. */
export function nextId(scene: LogoScene, prefix = 'e'): string {
  const taken = new Set(scene.elements.map((element) => element.id));
  for (let index = 1; ; index++) {
    const id = `${prefix}${index}`;
    if (!taken.has(id)) return id;
  }
}

export function findElement(scene: LogoScene, id: string | null): SceneElement | undefined {
  return id ? scene.elements.find((element) => element.id === id) : undefined;
}

export function replaceElement(scene: LogoScene, element: SceneElement): LogoScene {
  return {
    ...scene,
    elements: scene.elements.map((item) => (item.id === element.id ? element : item)),
  };
}

export function removeElement(scene: LogoScene, id: string): LogoScene {
  return { ...scene, elements: scene.elements.filter((element) => element.id !== id) };
}

/**
 * Uma cópia logo à frente do original, um pouco deslocada (pra ela ver que duplicou). O nome da
 * loja copiado vira texto dela (com o nome escrito), pra não haver dois "nomes da loja".
 */
export function duplicateElement(
  scene: LogoScene,
  id: string,
  name: string,
): { scene: LogoScene; id: string } | undefined {
  const index = scene.elements.findIndex((element) => element.id === id);
  const original = scene.elements[index];
  if (!original || scene.elements.length >= MAX_ELEMENTS) return undefined;
  const copyId = nextId(scene);
  let copy: SceneElement = {
    ...original,
    id: copyId,
    x: clampCenter(original.x + 30),
    y: clampCenter(original.y + 30),
  };
  if (copy.type === 'text' && copy.source !== 'custom') {
    copy = {
      ...copy,
      source: 'custom',
      value: textContent(copy as TextElement, name).slice(0, 40),
    };
  }
  const elements = [...scene.elements];
  elements.splice(index + 1, 0, copy);
  return { scene: { ...scene, elements }, id: copyId };
}

/** Uma camada pra frente (`1`) ou pra trás (`-1`). Na ponta, nada muda. */
export function moveLayer(scene: LogoScene, id: string, direction: 1 | -1): LogoScene {
  const index = scene.elements.findIndex((element) => element.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= scene.elements.length) return scene;
  const elements = [...scene.elements];
  [elements[index], elements[target]] = [elements[target]!, elements[index]!];
  return { ...scene, elements };
}

/**
 * O histórico: as cenas de antes (pra desfazer) e as desfeitas (pra refazer). Mudanças contínuas
 * (arrastar, um controle deslizante) entram uma vez só: quem chama marca o começo com `record`.
 */
export type History = { past: LogoScene[]; future: LogoScene[] };

const HISTORY_LIMIT = 50;

export function record(history: History, scene: LogoScene): History {
  return { past: [...history.past, scene].slice(-HISTORY_LIMIT), future: [] };
}

export function undo(
  history: History,
  scene: LogoScene,
): { history: History; scene: LogoScene } | undefined {
  const previous = history.past.at(-1);
  if (!previous) return undefined;
  return {
    history: { past: history.past.slice(0, -1), future: [scene, ...history.future] },
    scene: previous,
  };
}

export function redo(
  history: History,
  scene: LogoScene,
): { history: History; scene: LogoScene } | undefined {
  const [next, ...rest] = history.future;
  if (!next) return undefined;
  return { history: { past: [...history.past, scene], future: rest }, scene: next };
}

import type { Font } from 'opentype.js';
import type { LogoFontId } from './fonts';
import { iconNode } from './icons';
import {
  SCENE_SIZE,
  type IconElement,
  type LogoScene,
  type SceneElement,
  type ShapeElement,
  type TextElement,
} from './scene';
import { drawText, firstLetter, round } from './text';

/** As fontes já carregadas (no servidor, fonts.server.ts). */
export type LogoFonts = Record<LogoFontId, Font>;

/** O nome que entra no logo quando a marca ainda não tem nome. */
export const NAME_FALLBACK = 'Sua loja';

/**
 * O logo em SVG, a partir da cena. Função pura, igual no navegador e no servidor: o que ela vê no
 * editor é o que sai no PNG. Os textos viram contorno com a fonte (nada de texto no SVG), então
 * nada que ela digitou entra no arquivo como texto, e o desenho não depende de fonte instalada.
 */
export function renderSceneSvg(scene: LogoScene, name: string, fonts: LogoFonts): string {
  const parts = [`<rect width="${SCENE_SIZE}" height="${SCENE_SIZE}" fill="${scene.background}"/>`];
  for (const element of scene.elements) parts.push(renderElement(element, name, fonts));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_SIZE} ${SCENE_SIZE}" width="${SCENE_SIZE}" height="${SCENE_SIZE}">${parts.join('')}</svg>`;
}

/** Um elemento, desenhado em volta do (0, 0) e levado pro lugar dele (girado, se for o caso). */
export function renderElement(element: SceneElement, name: string, fonts: LogoFonts): string {
  const body = renderElementBody(element, name, fonts);
  const rotate = element.rotation ? ` rotate(${round(element.rotation)})` : '';
  const opacity = element.opacity < 1 ? ` opacity="${round(element.opacity, 2)}"` : '';
  return `<g transform="translate(${round(element.x)} ${round(element.y)})${rotate}"${opacity}>${body}</g>`;
}

/** O desenho do elemento em volta do (0, 0), sem levar pro lugar (o editor põe por cima as alças). */
export function renderElementBody(element: SceneElement, name: string, fonts: LogoFonts): string {
  if (element.type === 'text') return renderText(element, name, fonts);
  if (element.type === 'icon') return renderIcon(element);
  return renderShape(element);
}

/** O que o texto diz: o nome da loja, a inicial dele ou o texto dela. */
export function textContent(element: TextElement, name: string): string {
  const storeName = name.trim() || NAME_FALLBACK;
  if (element.source === 'initial') return firstLetter(storeName);
  if (element.source === 'custom') return element.value ?? '';
  return storeName;
}

function renderText(element: TextElement, name: string, fonts: LogoFonts): string {
  const block = drawText(fonts[element.font], textContent(element, name), element);
  const dx = -(block.box.x1 + block.box.x2) / 2;
  const dy = -(block.box.y1 + block.box.y2) / 2;
  return `<path transform="translate(${round(dx)} ${round(dy)})" d="${block.d}" fill="${element.color}"/>`;
}

/** Ícone do Lucide (traço, em 24×24) ampliado pro tamanho do elemento. */
function renderIcon(element: IconElement): string {
  const children = iconNode(element.icon)
    .map(([tag, attrs]) => {
      const attributes = Object.entries(attrs)
        .filter(([key]) => key !== 'key')
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(' ');
      return `<${tag} ${attributes}/>`;
    })
    .join('');
  const half = element.size / 2;
  const scale = element.size / 24;
  return `<g transform="translate(${round(-half)} ${round(-half)}) scale(${round(scale, 3)})" fill="none" stroke="${element.color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${children}</g>`;
}

function renderShape(element: ShapeElement): string {
  const rx = element.width / 2;
  const ry = element.height / 2;
  switch (element.shape) {
    case 'circle':
      return `<ellipse rx="${round(rx)}" ry="${round(ry)}" fill="${element.color}"/>`;
    case 'ring': {
      // O traço fica todo por dentro da forma: o tamanho dela é o de fora do anel.
      const stroke = element.stroke ?? 8;
      return `<ellipse rx="${round(rx - stroke / 2)}" ry="${round(ry - stroke / 2)}" fill="none" stroke="${element.color}" stroke-width="${round(stroke)}"/>`;
    }
    case 'rect':
      return `<rect x="${round(-rx)}" y="${round(-ry)}" width="${round(element.width)}" height="${round(element.height)}" rx="${round(element.radius ?? 0)}" fill="${element.color}"/>`;
  }
}

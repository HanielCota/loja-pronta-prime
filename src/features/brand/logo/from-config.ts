import type { LogoConfig } from './config';
import { colorHex, inkOn } from './palette';
import { SCENE_SIZE, type LogoScene, type SceneElement, type TextElement } from './scene';
import { NAME_FALLBACK, type LogoFonts } from './scene-render';
import { boxHeight, boxWidth, firstLetter, fitText, type FitOptions, type TextBlock } from './text';

const CENTER = SCENE_SIZE / 2;

const still = { rotation: 0, opacity: 1 } as const;

/**
 * Um modelo de logo (versão 1: formato, letra, cor, ícone e fundo) como cena, com cada
 * coisa no lugar em que o formato a põe. É o que o editor livre abre, e o desenho dos logos v1 sai
 * daqui (renderLogoSvg), então os dois são sempre iguais.
 *
 * Os textos guardam as linhas e o tamanho em que couberam com o nome de hoje: se o nome mudar,
 * a letra só diminui (nunca passa da largura de antes).
 */
export function configToScene(config: LogoConfig, name: string, fonts: LogoFonts): LogoScene {
  const font = fonts[config.font];
  const base = colorHex(config.color);
  // Fundo branco: nome e formas na cor. Fundo colorido: tudo em branco.
  const colored = config.background === 'cor';
  const paint = {
    bg: colored ? inkOn(base) : '#ffffff',
    ink: colored ? '#ffffff' : inkOn(base),
    fill: colored ? '#ffffff' : inkOn(base),
    onFill: colored ? inkOn(base) : '#ffffff',
  };
  const storeName = name.trim() || NAME_FALLBACK;
  const icon = config.icon;
  const elements: SceneElement[] = [];

  /** O texto que cabe nas regras do formato, como elemento centrado em (cx, cy). */
  function text(
    id: string,
    source: TextElement['source'],
    options: FitOptions,
  ): { block: TextBlock; at: (cx: number, cy: number, color: string) => void } {
    const content = source === 'initial' ? firstLetter(storeName) : storeName;
    const block = fitText(font, content, options);
    return {
      block,
      at: (cx, cy, color) =>
        elements.push({
          id,
          type: 'text',
          source,
          font: config.font,
          color,
          size: block.size,
          maxWidth: options.maxWidth,
          lines: block.lines,
          align: options.align ?? 'center',
          x: cx,
          y: cy,
          ...still,
        }),
    };
  }

  /** Ícone com o canto de cima à esquerda em (x, y). */
  function iconAt(x: number, y: number, size: number, color: string) {
    if (!icon) return;
    elements.push({
      id: 'icone',
      type: 'icon',
      icon,
      color,
      size,
      x: x + size / 2,
      y: y + size / 2,
      ...still,
    });
  }

  switch (config.layout) {
    case 'empilhado':
    case 'nome': {
      const showIcon = config.layout === 'empilhado' && Boolean(icon);
      const label =
        config.layout === 'nome'
          ? text('nome', 'name', { maxWidth: 720, maxSize: 210, minSize: 80, maxLines: 3 })
          : text('nome', 'name', { maxWidth: 680, maxSize: 150, minSize: 70, maxLines: 2 });
      const iconSize = showIcon ? 240 : 0;
      const gap = showIcon ? 56 : 0;
      const height = boxHeight(label.block.box);
      const top = CENTER - (iconSize + gap + height) / 2;
      if (showIcon) iconAt(CENTER - iconSize / 2, top, iconSize, paint.ink);
      label.at(CENTER, top + iconSize + gap + height / 2, paint.ink);
      break;
    }
    case 'lado': {
      if (!icon) {
        const label = text('nome', 'name', {
          maxWidth: 720,
          maxSize: 210,
          minSize: 80,
          maxLines: 3,
        });
        label.at(CENTER, CENTER, paint.ink);
        break;
      }
      const iconSize = 190;
      const gap = 44;
      const label = text('nome', 'name', {
        maxWidth: 760 - iconSize - gap,
        maxSize: 130,
        minSize: 56,
        maxLines: 2,
        align: 'left',
      });
      const width = boxWidth(label.block.box);
      const left = CENTER - (iconSize + gap + width) / 2;
      iconAt(left, CENTER - iconSize / 2, iconSize, paint.ink);
      label.at(left + iconSize + gap + width / 2, CENTER, paint.ink);
      break;
    }
    case 'selo': {
      elements.push({
        id: 'selo',
        type: 'shape',
        shape: 'circle',
        color: paint.fill,
        width: 860,
        height: 860,
        x: CENTER,
        y: CENTER,
        ...still,
      });
      // O traço de 8 centrado no raio 392 do desenho antigo: por fora, 396.
      elements.push({
        id: 'anel',
        type: 'shape',
        shape: 'ring',
        color: paint.onFill,
        width: 792,
        height: 792,
        stroke: 8,
        x: CENTER,
        y: CENTER,
        ...still,
      });
      const label = text('nome', 'name', { maxWidth: 560, maxSize: 120, minSize: 52, maxLines: 2 });
      const iconSize = icon ? 170 : 0;
      const gap = icon ? 40 : 0;
      const height = boxHeight(label.block.box);
      const top = CENTER - (iconSize + gap + height) / 2;
      iconAt(CENTER - iconSize / 2, top, iconSize, paint.onFill);
      label.at(CENTER, top + iconSize + gap + height / 2, paint.onFill);
      break;
    }
    case 'inicial': {
      const radius = 200;
      const initial = text('inicial', 'initial', {
        maxWidth: radius * 1.3,
        maxSize: 280,
        minSize: 120,
        maxLines: 1,
      });
      const label = text('nome', 'name', { maxWidth: 680, maxSize: 110, minSize: 52, maxLines: 2 });
      const gap = 56;
      const height = boxHeight(label.block.box);
      const top = CENTER - (radius * 2 + gap + height) / 2;
      const cy = top + radius;
      elements.push({
        id: 'circulo',
        type: 'shape',
        shape: 'circle',
        color: paint.fill,
        width: radius * 2,
        height: radius * 2,
        x: CENTER,
        y: cy,
        ...still,
      });
      initial.at(CENTER, cy, paint.onFill);
      label.at(CENTER, top + radius * 2 + gap + height / 2, paint.ink);
      break;
    }
    case 'faixa': {
      const label = text('nome', 'name', { maxWidth: 720, maxSize: 130, minSize: 56, maxLines: 2 });
      const iconSize = icon ? 180 : 0;
      const gap = icon ? 48 : 0;
      const padding = 56;
      const height = boxHeight(label.block.box);
      const band = height + padding * 2;
      const top = CENTER - (iconSize + gap + band) / 2;
      iconAt(CENTER - iconSize / 2, top, iconSize, paint.ink);
      const bandTop = top + iconSize + gap;
      elements.push({
        id: 'faixa',
        type: 'shape',
        shape: 'rect',
        color: paint.fill,
        width: 840,
        height: band,
        radius: 48,
        x: CENTER,
        y: bandTop + band / 2,
        ...still,
      });
      label.at(CENTER, bandTop + padding + height / 2, paint.onFill);
      break;
    }
  }

  return { version: 2, background: paint.bg, elements };
}

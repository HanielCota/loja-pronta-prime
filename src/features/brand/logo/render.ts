import { Path, type Font } from 'opentype.js';
import type { LogoConfig } from './config';
import type { LogoFontId } from './fonts';
import { iconNode } from './icons';
import { colorHex, inkOn } from './palette';

/** As fontes já carregadas (ver fonts.server.ts). */
export type LogoFonts = Record<LogoFontId, Font>;

/** Tela do logo: quadrada, como a foto de perfil da loja (a Shopee mostra num círculo). */
const SIZE = 1000;
const CENTER = SIZE / 2;

type Box = { x1: number; y1: number; x2: number; y2: number };
type Block = { d: string; box: Box };

/**
 * O logo em SVG. Função pura: o nome vira contorno com a fonte (nada de texto no SVG), então o
 * desenho é o mesmo na tela e no PNG, e nada que ela digitou entra no arquivo como texto.
 */
export function renderLogoSvg(config: LogoConfig, name: string, fonts: LogoFonts): string {
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
  const text = name.trim() || 'Sua loja';
  const icon = config.icon;

  const parts: string[] = [`<rect width="${SIZE}" height="${SIZE}" fill="${paint.bg}"/>`];

  switch (config.layout) {
    case 'empilhado':
    case 'nome': {
      const showIcon = config.layout === 'empilhado' && icon;
      const block =
        config.layout === 'nome'
          ? textBlock(font, text, { maxWidth: 720, maxSize: 210, minSize: 80, maxLines: 3 })
          : textBlock(font, text, { maxWidth: 680, maxSize: 150, minSize: 70, maxLines: 2 });
      const iconSize = showIcon ? 240 : 0;
      const gap = showIcon ? 56 : 0;
      const total = iconSize + gap + height(block);
      const top = CENTER - total / 2;
      if (showIcon) parts.push(drawIcon(icon, CENTER - iconSize / 2, top, iconSize, paint.ink));
      parts.push(place(block, CENTER, top + iconSize + gap, paint.ink));
      break;
    }
    case 'lado': {
      if (!icon) {
        const block = textBlock(font, text, {
          maxWidth: 720,
          maxSize: 210,
          minSize: 80,
          maxLines: 3,
        });
        parts.push(place(block, CENTER, CENTER - height(block) / 2, paint.ink));
        break;
      }
      const iconSize = 190;
      const gap = 44;
      const block = textBlock(font, text, {
        maxWidth: 760 - iconSize - gap,
        maxSize: 130,
        minSize: 56,
        maxLines: 2,
        align: 'left',
      });
      const total = iconSize + gap + width(block);
      const left = CENTER - total / 2;
      parts.push(drawIcon(icon, left, CENTER - iconSize / 2, iconSize, paint.ink));
      parts.push(placeLeft(block, left + iconSize + gap, CENTER - height(block) / 2, paint.ink));
      break;
    }
    case 'selo': {
      parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="430" fill="${paint.fill}"/>`);
      parts.push(
        `<circle cx="${CENTER}" cy="${CENTER}" r="392" fill="none" stroke="${paint.onFill}" stroke-width="8"/>`,
      );
      const block = textBlock(font, text, {
        maxWidth: 560,
        maxSize: 120,
        minSize: 52,
        maxLines: 2,
      });
      const iconSize = icon ? 170 : 0;
      const gap = icon ? 40 : 0;
      const top = CENTER - (iconSize + gap + height(block)) / 2;
      if (icon) parts.push(drawIcon(icon, CENTER - iconSize / 2, top, iconSize, paint.onFill));
      parts.push(place(block, CENTER, top + iconSize + gap, paint.onFill));
      break;
    }
    case 'inicial': {
      const radius = 200;
      const initial = textBlock(font, firstLetter(text), {
        maxWidth: radius * 1.3,
        maxSize: 280,
        minSize: 120,
        maxLines: 1,
      });
      const block = textBlock(font, text, {
        maxWidth: 680,
        maxSize: 110,
        minSize: 52,
        maxLines: 2,
      });
      const gap = 56;
      const top = CENTER - (radius * 2 + gap + height(block)) / 2;
      const cy = top + radius;
      parts.push(`<circle cx="${CENTER}" cy="${round(cy)}" r="${radius}" fill="${paint.fill}"/>`);
      parts.push(place(initial, CENTER, cy - height(initial) / 2, paint.onFill));
      parts.push(place(block, CENTER, top + radius * 2 + gap, paint.ink));
      break;
    }
    case 'faixa': {
      const block = textBlock(font, text, {
        maxWidth: 720,
        maxSize: 130,
        minSize: 56,
        maxLines: 2,
      });
      const iconSize = icon ? 180 : 0;
      const gap = icon ? 48 : 0;
      const padding = 56;
      const band = height(block) + padding * 2;
      const top = CENTER - (iconSize + gap + band) / 2;
      if (icon) parts.push(drawIcon(icon, CENTER - iconSize / 2, top, iconSize, paint.ink));
      const bandTop = top + iconSize + gap;
      parts.push(
        `<rect x="80" y="${round(bandTop)}" width="840" height="${round(band)}" rx="48" fill="${paint.fill}"/>`,
      );
      parts.push(place(block, CENTER, bandTop + padding, paint.onFill));
      break;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${parts.join('')}</svg>`;
}

type TextOptions = {
  maxWidth: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  align?: 'center' | 'left';
};

/**
 * O nome no maior tamanho que cabe na largura. Quebra em duas (ou três) linhas, dividindo as
 * palavras pra as linhas ficarem parecidas, quando isso deixa o nome bem maior (25% ou mais): um
 * nome curto fica numa linha, um comprido não fica miúdo.
 */
function textBlock(font: Font, text: string, options: TextOptions): Block {
  const words = text.split(/\s+/).filter(Boolean);
  let best: { lines: string[]; size: number } | undefined;
  for (let count = 1; count <= Math.min(options.maxLines, words.length); count++) {
    const lines = balancedLines(font, words, count);
    const widest = Math.max(...lines.map((line) => advance(font, line, 1)));
    const size = Math.min(options.maxSize, options.maxWidth / widest);
    if (!best || size > best.size * 1.25 || best.size < options.minSize) best = { lines, size };
    if (best.size >= options.maxSize) break;
  }
  const { lines, size } = best ?? { lines: [text], size: options.minSize };
  const lineHeight = size * 1.12;
  const widths = lines.map((line) => advance(font, line, size));
  const widest = Math.max(...widths);

  const paths = lines.map((line, index) => {
    const x = options.align === 'left' ? 0 : (widest - (widths[index] ?? 0)) / 2;
    return linePath(font, line, x, index * lineHeight, size);
  });
  const boxes = paths.map((path) => path.getBoundingBox());
  const box = {
    x1: Math.min(...boxes.map((b) => b.x1)),
    y1: Math.min(...boxes.map((b) => b.y1)),
    x2: Math.max(...boxes.map((b) => b.x2)),
    y2: Math.max(...boxes.map((b) => b.y2)),
  };
  return { d: paths.map(pathData).join(''), box };
}

/** Divide as palavras em `count` linhas, escolhendo a divisão com a linha mais larga menor. */
function balancedLines(font: Font, words: string[], count: number): string[] {
  if (count <= 1) return [words.join(' ')];
  let best: string[] = [words.join(' ')];
  let bestWidth = Infinity;
  for (let split = 1; split <= words.length - count + 1; split++) {
    const first = words.slice(0, split).join(' ');
    const rest = balancedLines(font, words.slice(split), count - 1);
    const lines = [first, ...rest];
    const widest = Math.max(...lines.map((line) => advance(font, line, 1)));
    if (widest < bestWidth) {
      bestWidth = widest;
      best = lines;
    }
  }
  return best;
}

/**
 * Largura e desenho de uma linha, letra por letra. Sem o layout de texto do opentype.js: na
 * versão 2, o kerning dele gera coordenadas inválidas (NaN) em algumas fontes, e a letra some.
 */
function advance(font: Font, text: string, size: number): number {
  const scale = size / font.unitsPerEm;
  return font
    .stringToGlyphs(text)
    .reduce((sum, glyph) => sum + (glyph.advanceWidth ?? 0) * scale, 0);
}

function linePath(font: Font, text: string, x: number, y: number, size: number): Path {
  const scale = size / font.unitsPerEm;
  const path = new Path();
  let cursor = x;
  for (const glyph of font.stringToGlyphs(text)) {
    path.extend(glyph.getPath(cursor, y, size));
    cursor += (glyph.advanceWidth ?? 0) * scale;
  }
  return path;
}

/**
 * Os comandos do contorno em texto. Sem o toPathData do opentype.js: ele escreve "NaN" pra alguns
 * números ao arredondar, e o navegador descarta o resto do desenho (a letra ou a linha somem).
 */
const n = (value: number) => String(round(value));

function pathData(path: Path): string {
  return path.commands
    .map((command) => {
      switch (command.type) {
        case 'M':
        case 'L':
          return `${command.type}${n(command.x)} ${n(command.y)}`;
        case 'Q':
          return `Q${n(command.x1)} ${n(command.y1)} ${n(command.x)} ${n(command.y)}`;
        case 'C':
          return `C${n(command.x1)} ${n(command.y1)} ${n(command.x2)} ${n(command.y2)} ${n(command.x)} ${n(command.y)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join('');
}

const width = (block: Block) => block.box.x2 - block.box.x1;
const height = (block: Block) => block.box.y2 - block.box.y1;

/** O bloco centralizado em `cx`, com o topo do desenho em `top`. */
function place(block: Block, cx: number, top: number, color: string): string {
  const dx = cx - (block.box.x1 + block.box.x2) / 2;
  const dy = top - block.box.y1;
  return `<path transform="translate(${round(dx)} ${round(dy)})" d="${block.d}" fill="${color}"/>`;
}

/** O bloco alinhado à esquerda em `left`, com o topo do desenho em `top`. */
function placeLeft(block: Block, left: number, top: number, color: string): string {
  const dx = left - block.box.x1;
  const dy = top - block.box.y1;
  return `<path transform="translate(${round(dx)} ${round(dy)})" d="${block.d}" fill="${color}"/>`;
}

/** Ícone do Lucide (traço, em 24×24) ampliado pro tamanho pedido. */
function drawIcon(
  id: Parameters<typeof iconNode>[0],
  x: number,
  y: number,
  size: number,
  color: string,
) {
  const children = iconNode(id)
    .map(([tag, attrs]) => {
      const attributes = Object.entries(attrs)
        .filter(([key]) => key !== 'key')
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(' ');
      return `<${tag} ${attributes}/>`;
    })
    .join('');
  const scale = size / 24;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(scale, 3)})" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${children}</g>`;
}

function firstLetter(text: string): string {
  return (text.match(/\p{L}|\p{N}/u)?.[0] ?? text.charAt(0)).toUpperCase();
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

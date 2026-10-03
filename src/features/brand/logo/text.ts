import { Path, type Font } from 'opentype.js';

/** Caixa do desenho de um texto (em unidades da tela do logo). */
export type Box = { x1: number; y1: number; x2: number; y2: number };

/** Um texto pronto pra desenhar: o contorno, a caixa dele e como saiu (linhas e tamanho). */
export type TextBlock = { d: string; box: Box; lines: number; size: number };

export type FitOptions = {
  maxWidth: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  align?: 'center' | 'left' | undefined;
};

/**
 * O texto no maior tamanho que cabe na largura. Quebra em duas (ou três) linhas, dividindo as
 * palavras pra as linhas ficarem parecidas, quando isso deixa o texto bem maior (25% ou mais): um
 * nome curto fica numa linha, um comprido não fica miúdo.
 */
export function fitText(font: Font, text: string, options: FitOptions): TextBlock {
  const words = splitWords(text);
  let best: { lines: number; size: number } | undefined;
  for (let count = 1; count <= Math.min(options.maxLines, words.length); count++) {
    const widest = widestLine(font, balancedLines(font, words, count));
    const size = Math.min(options.maxSize, options.maxWidth / widest);
    if (!best || size > best.size * 1.25 || best.size < options.minSize) {
      best = { lines: count, size };
    }
    if (best.size >= options.maxSize) break;
  }
  return drawText(font, text, {
    lines: best?.lines ?? 1,
    size: best?.size ?? options.minSize,
    maxWidth: options.maxWidth,
    align: options.align,
  });
}

/**
 * O texto em `lines` linhas (ou menos, se não houver palavras pra tanto), no tamanho `size`, ou
 * menor se a linha mais larga passar de `maxWidth`.
 */
export function drawText(
  font: Font,
  text: string,
  options: { lines: number; size: number; maxWidth: number; align?: 'center' | 'left' | undefined },
): TextBlock {
  const words = splitWords(text);
  const lines = balancedLines(font, words, Math.max(1, Math.min(options.lines, words.length)));
  const size = Math.min(options.size, options.maxWidth / widestLine(font, lines));
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
  return { d: paths.map(pathData).join(''), box, lines: lines.length, size };
}

export const boxWidth = (box: Box) => box.x2 - box.x1;
export const boxHeight = (box: Box) => box.y2 - box.y1;

/** A primeira letra (ou número) do texto, maiúscula: a do formato "Inicial em destaque". */
export function firstLetter(text: string): string {
  return (text.match(/\p{L}|\p{N}/u)?.[0] ?? text.charAt(0)).toUpperCase();
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function splitWords(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length ? words : [text];
}

function widestLine(font: Font, lines: string[]): number {
  return Math.max(...lines.map((line) => advance(font, line, 1)));
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
    const widest = widestLine(font, lines);
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

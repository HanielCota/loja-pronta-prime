/**
 * Baixa as figurinhas do logo do Fluent Emoji (Microsoft, licença MIT), estilo "Flat", e gera
 * src/features/brand/logo/sticker-art.ts. Cada SVG passa por uma limpeza rígida: só formas
 * (path, ellipse, circle, rect, g) com atributos de desenho e cores fixas. Qualquer outra coisa
 * (script, link, gradiente, estilo) faz a figurinha ser recusada, não "limpa pela metade".
 * Rode de novo depois de mudar a lista (sticker-list.ts).
 *
 *   bun scripts/gerar-figurinhas-logo.ts
 */
import { writeFileSync } from 'node:fs';
import { STICKER_LIST } from '@/features/brand/logo/sticker-list';

const BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';
const OUTPUT = 'src/features/brand/logo/sticker-art.ts';

const TAGS = new Set(['path', 'ellipse', 'circle', 'rect', 'g']);
const ATTRIBUTES = new Set([
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'width',
  'height',
  'fill',
  'fill-rule',
  'clip-rule',
  'fill-opacity',
  'opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'transform',
]);
/** Cor fixa (#abc, #aabbcc, white, black) ou nenhuma: nada de url(#...) nem de outro elemento. */
const PAINT = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|none|white|black)$/i;
/** Números, espaços, vírgulas e os comandos de caminho e de transformação: mais nada. */
const GEOMETRY = /^[\d\s.,eE+\-a-zA-Z()]*$/;

function fileName(source: string) {
  return `${source.toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')}_flat.svg`;
}

/** O desenho de dentro do SVG, já conferido; recusa a figurinha se aparecer algo fora da regra. */
function clean(svg: string, id: string): string {
  const viewBox = svg.match(/viewBox="0 0 32 32"/);
  if (!viewBox) throw new Error(`${id}: viewBox inesperado`);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const parts: string[] = [];
  for (const match of inner.matchAll(/<\/?([a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g)) {
    const [, tag, attrs = '', selfClosing, text] = match;
    if (text !== undefined) {
      if (text.trim()) throw new Error(`${id}: texto solto no SVG`);
      continue;
    }
    if (!tag || !TAGS.has(tag)) throw new Error(`${id}: <${tag}> não é permitido`);
    if (match[0].startsWith('</')) {
      parts.push(`</${tag}>`);
      continue;
    }
    const kept: string[] = [];
    for (const [, name, value] of attrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      if (!name || value === undefined || !ATTRIBUTES.has(name)) {
        throw new Error(`${id}: atributo ${name} não é permitido`);
      }
      const paint = name === 'fill' || name === 'stroke';
      if (paint ? !PAINT.test(value) : !GEOMETRY.test(value)) {
        throw new Error(`${id}: valor estranho em ${name}`);
      }
      kept.push(`${name}="${value}"`);
    }
    parts.push(`<${tag}${kept.length ? ` ${kept.join(' ')}` : ''}${selfClosing ? '/' : ''}>`);
  }
  return parts.join('');
}

const entries: string[] = [];
for (const sticker of STICKER_LIST) {
  const url = `${BASE}/${encodeURIComponent(sticker.source)}/Flat/${fileName(sticker.source)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${sticker.id}: ${response.status} em ${url}`);
  entries.push(`  '${sticker.id}': ${JSON.stringify(clean(await response.text(), sticker.id))},`);
}

writeFileSync(
  OUTPUT,
  `// Gerado por scripts/gerar-figurinhas-logo.ts a partir do Fluent Emoji (Microsoft, licença MIT).
// Não edite à mão: mude a lista em sticker-list.ts e rode o script de novo.

/** O desenho de cada figurinha (já conferido: só formas e cores fixas), num quadrado de 32. */
export const STICKER_ART: Record<string, string> = {
${entries.join('\n')}
};
`,
);
console.log(`${entries.length} figurinhas em ${OUTPUT}`);

/**
 * As cores escritas num texto ("Rosa e dourado"), na ordem em que aparecem: viram bolinhas
 * coloridas nas respostas rápidas, pra ela escolher a cor vendo, não só lendo. Função pura.
 */

/** Nome da cor (sem acento, minúsculo) → a cor. Os nomes compostos vêm antes dos simples. */
const COLORS: [string, string][] = [
  ['azul marinho', '#1A2A6C'],
  ['azul claro', '#8EC9F2'],
  ['azul bebe', '#A9D4F5'],
  ['verde agua', '#5CC2B5'],
  ['verde claro', '#9ED99A'],
  ['rosa claro', '#F8BBD0'],
  ['rosa choque', '#E91E8C'],
  ['off white', '#F7F3EA'],
  ['rosa', '#F07AA8'],
  ['pink', '#E91E8C'],
  ['dourado', '#D4AF37'],
  ['dourada', '#D4AF37'],
  ['ouro', '#D4AF37'],
  ['prata', '#C0C0C0'],
  ['prateado', '#C0C0C0'],
  ['azul', '#1E7BE0'],
  ['marinho', '#1A2A6C'],
  ['celeste', '#8EC9F2'],
  ['turquesa', '#1CC7C1'],
  ['verde', '#3BA55C'],
  ['menta', '#98E2C6'],
  ['amarelo', '#F7C928'],
  ['laranja', '#F5841F'],
  ['coral', '#FF7F50'],
  ['salmao', '#F8957A'],
  ['vermelho', '#E03A3A'],
  ['vinho', '#7B1E3A'],
  ['bordo', '#7B1E3A'],
  ['roxo', '#7E3FB8'],
  ['lilas', '#C3A3E0'],
  ['lavanda', '#B9A7E8'],
  ['preto', '#161616'],
  ['branco', '#FFFFFF'],
  ['cinza', '#9A9A9A'],
  ['bege', '#E6D3B3'],
  ['nude', '#E3BC9A'],
  ['creme', '#FFF3D6'],
  ['champanhe', '#F2DFC2'],
  ['marrom', '#6D4C41'],
  ['terracota', '#C8643B'],
];

const MAX_COLORS = 3;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ');
}

/** As cores do texto (até 3, sem repetir), como "#RRGGBB". */
export function colorsIn(text: string): string[] {
  let rest = ` ${normalize(text)} `;
  const found: { at: number; color: string }[] = [];
  for (const [name, color] of COLORS) {
    const pattern = new RegExp(`(?<=[^\\p{L}])${name}s?(?=[^\\p{L}])`, 'u');
    let match = pattern.exec(rest);
    while (match) {
      found.push({ at: match.index, color });
      // Apaga o nome achado, pra "azul" não achar de novo o "azul" de "azul marinho".
      rest =
        rest.slice(0, match.index) +
        ' '.repeat(match[0].length) +
        rest.slice(match.index + match[0].length);
      match = pattern.exec(rest);
    }
  }
  return [...new Set(found.toSorted((a, b) => a.at - b.at).map((item) => item.color))].slice(
    0,
    MAX_COLORS,
  );
}

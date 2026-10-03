/**
 * Cores do logo: as 6 da conversa inicial (mesmos valores) e mais algumas. A aluna escolhe pela
 * amostra; o desenho escurece a cor só o necessário pra o nome continuar legível (ver inkOn).
 */
export const LOGO_COLORS = [
  { id: 'rosa', label: 'Rosa', hex: '#e85d8e' },
  { id: 'lilas', label: 'Lilás', hex: '#9b7bd4' },
  { id: 'azul', label: 'Azul', hex: '#2f7de1' },
  { id: 'verde', label: 'Verde', hex: '#3ba776' },
  { id: 'terracota', label: 'Terracota', hex: '#c8643b' },
  { id: 'preto', label: 'Preto', hex: '#1d1d1f' },
  { id: 'vermelho', label: 'Vermelho', hex: '#d6453d' },
  { id: 'laranja', label: 'Laranja', hex: '#f08a24' },
  { id: 'mostarda', label: 'Mostarda', hex: '#d9a21b' },
  { id: 'turquesa', label: 'Turquesa', hex: '#1fa5a5' },
  { id: 'marrom', label: 'Marrom', hex: '#8a5a3c' },
  { id: 'dourado', label: 'Dourado', hex: '#b8913a' },
] as const;

export type LogoColorId = (typeof LOGO_COLORS)[number]['id'];

export const LOGO_COLOR_IDS = LOGO_COLORS.map((color) => color.id) as [
  LogoColorId,
  ...LogoColorId[],
];

export function colorHex(id: LogoColorId): string {
  return LOGO_COLORS.find((color) => color.id === id)?.hex ?? LOGO_COLORS[0].hex;
}

/** Cor da conversa ("Rosa", "Lilás"...) pro id do logo. Sem cor (deixou pra depois): nada. */
export function colorFromAnswer(label: string | undefined): LogoColorId | undefined {
  return LOGO_COLORS.find((color) => color.label === label)?.id;
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A cor, escurecida aos poucos até ter pelo menos 3:1 contra o branco (texto grande, WCAG):
 * serve tanto pro nome colorido no fundo branco quanto pro fundo colorido com o nome em branco.
 */
export function inkOn(hex: string, minimum = 3): string {
  let current = channels(hex);
  for (let step = 0; step < 20 && contrast(toHex(current), '#ffffff') < minimum; step++) {
    current = current.map((c) => c * 0.92) as [number, number, number];
  }
  return toHex(current);
}

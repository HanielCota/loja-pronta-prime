import { isCustomColor } from '@/config/onboarding';
import { colorsIn } from './color-words';
import type { LogoPicks } from './model';
import { LOGO_PALETTES, type LogoLetteringId, type LogoSymbolId } from './options';

/**
 * O rascunho do logo, montado na tela a cada escolha (sem IA, sem custo): as cores, a letra e o
 * desenho que as escolhas pedem. Só pra ela imaginar; quem desenha a versão final é a IA.
 * Funções puras (a tela só desenha).
 */

const WHITE = '#FFFFFF';
/** Antes de ela escolher as cores: um cinza escuro, que lê bem no branco. */
const NEUTRAL = { primary: '#3A3A3C', accent: '#8E8E93', tint: '#F2F2F4' };

/** "#RRGGBB" em [r, g, b]. */
const channels = (value: string) =>
  [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16));

/** Mistura `hex` com `to` (0 = só `hex`, 1 = só `to`). */
export function mixColor(hex: string, to: string, amount: number): string {
  const from = channels(hex);
  const target = channels(to);
  return `#${from
    .map((channel, index) =>
      Math.round(channel + (target[index]! - channel) * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

/** As cores do que ela escreveu ("verde e branco"); sem cor reconhecida, as neutras. */
function ownColors(text: string) {
  // A cor que ela escolheu na conversa ("#rrggbb").
  if (isCustomColor(text)) {
    const primary = text.toUpperCase();
    return {
      primary,
      accent: mixColor(primary, WHITE, 0.45),
      tint: mixColor(primary, WHITE, 0.88),
    };
  }
  // O branco não serve de cor principal: some no fundo branco.
  const found = colorsIn(text).filter((color) => color !== WHITE);
  const [primary, accent] = found;
  if (!primary) return NEUTRAL;
  return {
    primary,
    accent: accent ?? mixColor(primary, WHITE, 0.45),
    tint: mixColor(primary, WHITE, 0.88),
  };
}

/**
 * A letra do rascunho. `width`: a largura média de uma letra (em "em"), pra caber o nome sem
 * medir; `upper`: tudo em maiúsculas.
 */
export type DraftFont = {
  id: LogoLetteringId | null;
  weight: number;
  width: number;
  upper: boolean;
  tracking: number;
};

const FONTS: Record<LogoLetteringId, Omit<DraftFont, 'id'>> = {
  delicada: { weight: 700, width: 0.46, upper: false, tracking: 0 },
  elegante: { weight: 700, width: 0.58, upper: false, tracking: 0 },
  moderna: { weight: 700, width: 0.74, upper: true, tracking: 2 },
  divertida: { weight: 600, width: 0.55, upper: false, tracking: 0 },
  simples: { weight: 600, width: 0.6, upper: false, tracking: 0 },
  marcante: { weight: 800, width: 0.66, upper: false, tracking: 0 },
};

/** Antes de escolher a letra (ou com a letra escrita do jeito dela): a da página. */
const PLAIN_FONT: DraftFont = { id: null, weight: 700, width: 0.58, upper: false, tracking: 0 };

/**
 * O desenho do rascunho: um da lista (`icon`), o que ela escreveu (`own`, a IA desenha), um
 * lugar guardado pro desenho que ela ainda vai escolher (`pending`) ou nenhum (só o nome).
 */
export type DraftSymbol =
  { kind: 'icon'; icon: LogoSymbolId } | { kind: 'own' } | { kind: 'pending' } | null;

export type Draft = {
  primary: string;
  accent: string;
  /** O fundo do quadro. */
  background: string;
  /** A cor do nome e do desenho (branco no fundo forte). */
  ink: string;
  /** O fundo da bolinha atrás do desenho. */
  badge: string;
  font: DraftFont;
  symbol: DraftSymbol;
  /** "Com volume": brilho e sombra. */
  volume: boolean;
};

export function draftOf(picks: LogoPicks): Draft {
  const colors = !picks.colors
    ? NEUTRAL
    : 'id' in picks.colors
      ? LOGO_PALETTES[picks.colors.id]
      : ownColors(picks.colors.text);
  const strong = picks.background === 'forte';
  const background = strong ? colors.primary : WHITE;
  const font = !picks.lettering
    ? PLAIN_FONT
    : 'id' in picks.lettering
      ? { id: picks.lettering.id, ...FONTS[picks.lettering.id] }
      : { ...FONTS.simples, id: 'simples' as const };
  const symbol: DraftSymbol =
    picks.kind === 'nome' || !picks.kind
      ? null
      : !picks.symbol
        ? { kind: 'pending' }
        : 'id' in picks.symbol
          ? { kind: 'icon', icon: picks.symbol.id }
          : { kind: 'own' };
  return {
    primary: colors.primary,
    accent: colors.accent,
    background,
    ink: strong ? WHITE : colors.primary,
    badge: strong ? mixColor(colors.primary, WHITE, 0.2) : colors.tint,
    font,
    symbol,
    volume: picks.look === 'realista',
  };
}

/** Quantas letras cabem numa linha antes de quebrar o nome em duas. */
const LINE_CHARS = 14;

/** O nome em uma linha, ou em duas (no espaço mais perto do meio) quando é comprido. */
export function nameLines(name: string): string[] {
  const text = name.trim();
  if (text.length <= LINE_CHARS || !text.includes(' ')) return [text];
  const middle = text.length / 2;
  let best = -1;
  for (let index = text.indexOf(' '); index !== -1; index = text.indexOf(' ', index + 1)) {
    if (best === -1 || Math.abs(index - middle) < Math.abs(best - middle)) best = index;
  }
  return [text.slice(0, best), text.slice(best + 1)];
}

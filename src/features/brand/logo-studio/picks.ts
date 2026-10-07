import { isCustomColor, type OnboardingAnswers } from '@/config/onboarding';
import { fontForStyle } from '../fonts';
import type { LogoBrief, LogoPicks } from './model';
import {
  LOGO_BACKGROUNDS,
  LOGO_KINDS,
  LOGO_LETTERINGS,
  LOGO_LOOKS,
  LOGO_PALETTES,
  LOGO_SYMBOLS,
  symbolChoices,
  type LogoBackgroundId,
  type LogoKindId,
  type LogoLetteringId,
  type LogoLookId,
  type LogoPaletteId,
  type LogoSymbolId,
} from './options';

/**
 * As telas do estúdio (uma escolha por tela), as sugestões e o resumo que vai pra imagem.
 * Funções puras.
 */

export const STUDIO_STEPS = {
  kind: { label: 'Tipo', title: 'Como você imagina o logo?' },
  symbol: { label: 'Desenho', title: 'Qual desenho combina com a sua loja?' },
  colors: { label: 'Cores', title: 'Quais cores?' },
  lettering: { label: 'Letras', title: 'Qual letra pro nome?' },
  background: { label: 'Fundo', title: 'E o fundo?' },
  look: { label: 'Estilo', title: 'Por último: qual estilo de desenho?' },
} as const;
export type StudioStep = keyof LogoPicks & keyof typeof STUDIO_STEPS;
const ALL_STEPS = Object.keys(STUDIO_STEPS) as StudioStep[];

/** As telas que valem pra essas escolhas ("Só o nome" pula o desenho). */
export function studioSteps(picks: LogoPicks): StudioStep[] {
  return picks.kind === 'nome' ? ALL_STEPS.filter((step) => step !== 'symbol') : ALL_STEPS;
}

/** As escolhas que ainda faltam para ela poder criar o logo. */
export function missingStudioSteps(picks: LogoPicks): StudioStep[] {
  return studioSteps(picks).filter((step) => {
    const pick = picks[step];
    if (!pick) return true;
    return typeof pick === 'object' && 'text' in pick && !pick.text.trim();
  });
}

/** A primeira tela ainda sem escolha (todas escolhidas: `null`). */
export function firstOpenStep(picks: LogoPicks): StudioStep | null {
  return missingStudioSteps(picks)[0] ?? null;
}

export function isComplete(picks: LogoPicks): boolean {
  return missingStudioSteps(picks).length === 0;
}

const list = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
      ? [value]
      : [];

/** As opções que já vêm marcadas como "Sugestão", pelo que ela contou na conversa inicial. */
export type StudioSuggestions = {
  kind: LogoKindId;
  /** Os desenhos da tela (o primeiro é a sugestão). */
  symbols: LogoSymbolId[];
  /** A cor sugerida: uma da lista, ou "propria" (a cor que ela escolheu na conversa). */
  colors: LogoPaletteId | typeof OWN_COLOR;
  /** A cor que ela escolheu na conversa ("#rrggbb"), quando escolheu uma fora da lista. */
  customColor: string | undefined;
  lettering: LogoLetteringId;
  background: LogoBackgroundId;
  look: LogoLookId;
};

/** O valor da opção "A sua cor" na tela das cores. */
export const OWN_COLOR = 'propria';

export function studioSuggestions(answers: OnboardingAnswers): StudioSuggestions {
  const color = list(answers.cor)[0];
  const customColor = isCustomColor(color) ? color : undefined;
  const style = list(answers.estilo)[0];
  return {
    kind: 'desenho',
    symbols: symbolChoices(list(answers.categorias)),
    colors: customColor
      ? OWN_COLOR
      : ((Object.keys(LOGO_PALETTES) as LogoPaletteId[]).find(
          (id) => LOGO_PALETTES[id].answer === color,
        ) ?? 'rosa'),
    customColor,
    lettering: fontForStyle(style),
    background: 'branco',
    look: 'ilustracao',
  };
}

/** Mantém a fonte escolhida na conversa ao abrir o estúdio, sem trocar uma escolha já salva. */
export function withSuggestedLettering(picks: LogoPicks, suggested: LogoLetteringId): LogoPicks {
  return picks.lettering ? picks : { ...picks, lettering: { id: suggested } };
}

/** O que a escolha de uma tela diz, em palavras (o resumo, a barra das telas). */
export function pickLabel(step: StudioStep, picks: LogoPicks): string | null {
  switch (step) {
    case 'kind':
      return picks.kind ? LOGO_KINDS[picks.kind].label : null;
    case 'symbol':
      return choiceLabel(picks.symbol, (id) => LOGO_SYMBOLS[id].label);
    case 'colors':
      return choiceLabel(picks.colors, (id) => LOGO_PALETTES[id].label);
    case 'lettering':
      return choiceLabel(picks.lettering, (id) => LOGO_LETTERINGS[id].label);
    case 'background':
      return picks.background ? LOGO_BACKGROUNDS[picks.background].label : null;
    case 'look':
      return picks.look ? LOGO_LOOKS[picks.look].label : null;
  }
}

function choiceLabel<T extends string>(
  choice: { id: T } | { text: string } | undefined,
  label: (id: T) => string,
): string | null {
  if (!choice) return null;
  if ('id' in choice) return label(choice.id);
  return isCustomColor(choice.text) ? 'A sua cor' : `“${choice.text}”`;
}

/** O sentimento do logo, pelo estilo e pelo que ela quer que as clientes sintam. */
function moodFrom(answers: OnboardingAnswers): string {
  const style = list(answers.estilo)[0];
  const feelings = list(answers.sentimento).map((feeling) => feeling.toLowerCase());
  const parts = [
    style ? `estilo ${style.toLowerCase()}` : '',
    feelings.length ? `que passe ${feelings.join(' e ')}` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'acolhedor e confiável';
}

/** O desenho no resumo de um logo "Só o nome". */
export const NAME_ONLY_SYMBOL = 'nenhum desenho: só o nome da loja escrito';

/**
 * O resumo da imagem, com as escolhas dela (todas feitas: sem alguma, `null`). O que ela escreveu
 * vai como escreveu.
 */
export function briefFromPicks(picks: LogoPicks, answers: OnboardingAnswers): LogoBrief | null {
  const { kind, symbol, colors, lettering, background, look } = picks;
  if (!kind || !colors || !lettering || !background || !look) return null;
  if (kind === 'desenho' && !symbol) return null;
  const colorText =
    'id' in colors
      ? LOGO_PALETTES[colors.id].prompt
      : isCustomColor(colors.text)
        ? `a cor ${colors.text}`
        : colors.text;
  // O toque pessoal da conversa ("algo que não pode faltar") vai junto pro desenho.
  const touch = list(answers.toque)[0]?.replace(/\s+/g, ' ').trim().slice(0, 200);
  return {
    symbol:
      kind === 'nome'
        ? NAME_ONLY_SYMBOL
        : symbol && 'id' in symbol
          ? LOGO_SYMBOLS[symbol.id].prompt
          : (symbol?.text ?? ''),
    colors: colorText,
    lettering: 'id' in lettering ? LOGO_LETTERINGS[lettering.id].prompt : lettering.text,
    mood: moodFrom(answers),
    background:
      background === 'branco'
        ? 'branco liso'
        : `liso, na cor principal (${colorText}), com o desenho e o nome em branco`,
    look,
    ...(touch ? { extras: touch } : {}),
  };
}

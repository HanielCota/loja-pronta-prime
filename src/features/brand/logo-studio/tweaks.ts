import type { LogoBrief } from './model';

/**
 * Os ajustes de um toque depois de um logo ("Mais colorido", "Letra maior"...): cada um cria a
 * versão nova direto, sem ela precisar explicar. `prompt` vai pro modelo de imagem (em inglês).
 * Os ajustes continuam valendo nos próximos logos, menos o "Outro desenho" (vale só uma vez).
 */
export const LOGO_TWEAKS = {
  'mais-colorido': {
    label: 'Mais colorido',
    prompt: 'Make it more colorful and vibrant, with richer, more saturated colors.',
  },
  'letra-maior': {
    label: 'Letra maior',
    prompt: 'Make the store name lettering noticeably larger and bolder, very easy to read.',
  },
  'mais-simples': {
    label: 'Mais simples',
    prompt: 'Make it simpler and cleaner: fewer details and elements, more empty space.',
  },
  'outro-desenho': {
    label: 'Outro desenho',
    prompt:
      'Use a clearly different drawing or symbol idea from any previous version, keeping the colors and lettering style.',
  },
} as const;

export type LogoTweak = keyof typeof LOGO_TWEAKS;

export const LOGO_TWEAK_IDS = Object.keys(LOGO_TWEAKS) as LogoTweak[];

export function isLogoTweak(value: unknown): value is LogoTweak {
  return typeof value === 'string' && Object.hasOwn(LOGO_TWEAKS, value);
}

/** Os ajustes que ficam guardados no resumo (o "Outro desenho" vale só uma vez). */
export type LastingTweak = NonNullable<LogoBrief['tweaks']>[number];

export function isLastingTweak(tweak: LogoTweak): tweak is LastingTweak {
  return tweak !== 'outro-desenho';
}

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

/** O resumo com o ajuste guardado (só os que continuam valendo, sem repetir). */
export function briefWithTweak(brief: LogoBrief, tweak: LogoTweak): LogoBrief {
  if (tweak === 'outro-desenho') return brief;
  const tweaks = brief.tweaks ?? [];
  return tweaks.includes(tweak) ? brief : { ...brief, tweaks: [...tweaks, tweak] };
}

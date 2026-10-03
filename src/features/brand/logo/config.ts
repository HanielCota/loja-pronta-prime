import { z } from 'zod';
import type { OnboardingAnswers } from '@/config/onboarding';
import { fontForStyle, LOGO_FONT_IDS, type LogoFontId } from './fonts';
import { iconForCategories, LOGO_ICON_IDS, type LogoIconId } from './icons';
import { colorFromAnswer, LOGO_COLOR_IDS, type LogoColorId } from './palette';

/** Formatos do logo: onde ficam o ícone e o nome. */
export const LOGO_LAYOUTS = [
  { id: 'empilhado', label: 'Ícone em cima' },
  { id: 'lado', label: 'Ícone ao lado' },
  { id: 'nome', label: 'Só o nome' },
  { id: 'selo', label: 'Selo redondo' },
  { id: 'inicial', label: 'Inicial em destaque' },
  { id: 'faixa', label: 'Faixa' },
] as const;

export type LogoLayoutId = (typeof LOGO_LAYOUTS)[number]['id'];
const LAYOUT_IDS = LOGO_LAYOUTS.map((layout) => layout.id) as [LogoLayoutId, ...LogoLayoutId[]];

export const LOGO_BACKGROUNDS = [
  { id: 'branco', label: 'Fundo branco' },
  { id: 'cor', label: 'Fundo colorido' },
] as const;

export type LogoBackgroundId = (typeof LOGO_BACKGROUNDS)[number]['id'];

/** Quantos modelos prontos ela vê pra escolher. */
export const TEMPLATE_COUNT = 6;

/**
 * Como o logo está montado: o modelo de partida (pra "Voltar ao modelo") e o que ela mudou no
 * estúdio. O nome não fica aqui: é o da marca, guardado à parte.
 */
export const logoConfigSchema = z.object({
  template: z
    .number()
    .int()
    .min(0)
    .max(TEMPLATE_COUNT - 1),
  layout: z.enum(LAYOUT_IDS),
  font: z.enum(LOGO_FONT_IDS),
  color: z.enum(LOGO_COLOR_IDS),
  icon: z.enum(LOGO_ICON_IDS).nullable(),
  background: z.enum(['branco', 'cor']),
});

export type LogoConfig = z.infer<typeof logoConfigSchema>;

type Base = { font: LogoFontId; color: LogoColorId; icon: LogoIconId };

/**
 * O ponto de partida tirado da conversa: a letra do estilo, a cor que ela escolheu (ou uma do
 * estilo, se deixou pra depois) e o ícone da primeira categoria.
 */
export function logoBase(answers: OnboardingAnswers): Base {
  const style = typeof answers.estilo === 'string' ? answers.estilo : undefined;
  const color = colorFromAnswer(typeof answers.cor === 'string' ? answers.cor : undefined);
  const categories = Array.isArray(answers.categorias) ? answers.categorias : [];
  return {
    font: fontForStyle(style),
    color: color ?? COLOR_BY_STYLE[style ?? ''] ?? 'azul',
    icon: iconForCategories(categories),
  };
}

const COLOR_BY_STYLE: Record<string, LogoColorId> = {
  Delicado: 'rosa',
  Moderno: 'azul',
  Divertido: 'laranja',
  Elegante: 'preto',
};

/** Os 6 modelos prontos: um por formato, todos com a letra, a cor e o ícone dela. */
export function logoTemplates(answers: OnboardingAnswers): LogoConfig[] {
  const { font, color, icon } = logoBase(answers);
  const presets: Omit<LogoConfig, 'template' | 'color'>[] = [
    { layout: 'empilhado', font, icon, background: 'branco' },
    { layout: 'lado', font, icon, background: 'branco' },
    { layout: 'selo', font, icon, background: 'branco' },
    { layout: 'inicial', font, icon: null, background: 'branco' },
    { layout: 'nome', font, icon: null, background: 'cor' },
    {
      layout: 'faixa',
      font: font === 'simples' ? 'moderna' : 'simples',
      icon,
      background: 'branco',
    },
  ];
  return presets.map((preset, template) => ({ ...preset, template, color }));
}

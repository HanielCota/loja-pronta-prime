import type { StepHeader } from '@/features/loja-pronta/steps';
import type { LogoConfig } from './logo/config';

/**
 * Passos da marca (fase 2), na ordem. Cada passo é uma página (`/loja-pronta/marca/<passo>`) com
 * formulário de verdade, e cada escolha é salva: ela continua de onde parou.
 */
export const BRAND_PATH = '/loja-pronta/marca';
export const BRAND_DONE_PATH = `${BRAND_PATH}/pronta`;

export const BRAND_STEPS = ['nome', 'ajustar', 'descricao', 'revisao'] as const;
export type BrandStep = (typeof BRAND_STEPS)[number];

export type BrandDraft = {
  name: string | null;
  logo: LogoConfig | null;
  description: string | null;
};

const TITLES: Record<BrandStep, string> = {
  nome: 'Nome da loja',
  ajustar: 'Ajustar o logo',
  descricao: 'Descrição da loja',
  revisao: 'Revisão',
};

export function isBrandStep(value: string): value is BrandStep {
  return (BRAND_STEPS as readonly string[]).includes(value);
}

export function brandStepPath(step: BrandStep): string {
  return `${BRAND_PATH}/${step}`;
}

/**
 * Onde ela parou: sem nome, o nome; sem logo, o modelo; com logo e sem descrição, o estúdio (ela
 * pode ter saído no meio dos ajustes); com tudo, a revisão.
 */
export function resumeBrandStep(draft: BrandDraft): BrandStep {
  if (!draft.name) return 'nome';
  if (!draft.description) return 'ajustar';
  return 'revisao';
}

/** Até onde ela pode ir: os passos já feitos e o próximo (a revisão, só com tudo escolhido). */
export function canOpenBrandStep(step: BrandStep, draft: BrandDraft): boolean {
  const needs: Record<BrandStep, boolean> = {
    nome: true,
    ajustar: Boolean(draft.name),
    descricao: Boolean(draft.name && draft.logo),
    revisao: Boolean(draft.name && draft.logo && draft.description),
  };
  return needs[step];
}

/** "Voltar": o passo anterior (do primeiro, a área da Loja Pronta). */
export function previousBrandPath(step: BrandStep): string {
  const previous = BRAND_STEPS[BRAND_STEPS.indexOf(step) - 1];
  return previous ? brandStepPath(previous) : '/loja-pronta';
}

/** O nome curto de cada passo (o leitor de tela ouve junto com "Passo 1 de 3"). */
const STEP_NAMES = ['Nome', 'Logo', 'Texto'] as const;

export function brandStepTitle(step: BrandStep): string {
  return TITLES[step];
}

/** O topo de cada passo: "Passo 2 de 3" (ou a revisão) e a barra. */
export function brandStepHeader(step: BrandStep): StepHeader {
  const total = BRAND_STEPS.length - 1;
  if (step === 'revisao') return { label: 'Revisão da marca', filled: total, total };
  const number = BRAND_STEPS.indexOf(step) + 1;
  return {
    label: `Passo ${number} de ${total}`,
    filled: number,
    total,
    names: STEP_NAMES,
  };
}

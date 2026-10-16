import type { OnboardingAnswers } from '@/config/onboarding';
import { findQuestion, resumeStep } from '@/features/loja-pronta/steps';
import { resumeBrandStep, type BrandDraft } from '@/features/brand/steps';

export const STORE_PHASE_LABELS = [
  'Initial conversation',
  'Store brand',
  'Shopee account',
  'Shopee connection',
  'Products',
  'Publication',
  'Store completion',
] as const;

/** Describe the saved next step without opening a student session or changing their progress. */
export function currentStoreStep({
  phase,
  answers,
  brand,
}: {
  phase: number;
  answers: OnboardingAnswers;
  brand: BrandDraft & { completedAt: Date | null };
}): { title: string; detail: string } {
  if (phase === 1) {
    const question = findQuestion(resumeStep(answers));
    return question
      ? { title: 'Answer the next question', detail: question.ask }
      : {
          title: 'Review answers and confirm WhatsApp',
          detail:
            'All questions have saved answers. The student still needs to submit the conversation.',
        };
  }
  if (brand.completedAt && !brand.logoImage) {
    return {
      title: 'Create the missing logo',
      detail: 'The brand was confirmed without a logo. The student can create or upload one.',
    };
  }
  if (phase === 2) {
    const titles = {
      nome: 'Choose the store name',
      logo: 'Create or upload the logo',
      descricao: 'Write the store description',
      revisao: 'Review and confirm the brand',
    };
    return {
      title: titles[resumeBrandStep(brand)],
      detail: 'The student continues from the choices already saved below.',
    };
  }
  if (phase === 3) {
    return {
      title: 'Create the Shopee seller account',
      detail: 'The student follows the guide and confirms when their seller account is ready.',
    };
  }
  if (phase === 4) {
    return {
      title: 'Connect the Shopee account',
      detail:
        'The student authorizes the connection from their own Shopee account when the integration is available.',
    };
  }
  return {
    title: 'Coming soon',
    detail:
      phase === 5
        ? 'Product selection is still in preparation.'
        : phase === 6
          ? 'Automatic publication is still in preparation.'
          : 'Sales tracking is still in preparation. This phase does not confirm publication on Shopee.',
  };
}

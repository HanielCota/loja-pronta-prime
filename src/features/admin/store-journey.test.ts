import { describe, expect, test } from 'bun:test';
import { ONBOARDING_QUESTIONS, type OnboardingAnswers } from '@/config/onboarding';
import { currentStoreStep } from './store-journey';

const emptyBrand = { name: null, logoImage: null, description: null, completedAt: null };

describe('the student next step in the admin view', () => {
  test('resumes the first unanswered question and does not invent a saved answer', () => {
    const answers = { vendas: ONBOARDING_QUESTIONS[0].options[3].label };
    expect(currentStoreStep({ phase: 1, answers, brand: emptyBrand }).detail).toBe(
      ONBOARDING_QUESTIONS[1].ask,
    );
    expect(answers).toEqual({ vendas: ONBOARDING_QUESTIONS[0].options[3].label });
  });

  test('keeps review and WhatsApp pending until the conversation is submitted', () => {
    const answers: OnboardingAnswers = {
      vendas: ONBOARDING_QUESTIONS[0].options[3].label,
      estilo: ONBOARDING_QUESTIONS[1].options[2].label,
      cor: ONBOARDING_QUESTIONS[2].options[2].label,
      sentimento: [ONBOARDING_QUESTIONS[3].options[0].label],
      toque: '',
    };
    expect(currentStoreStep({ phase: 1, answers, brand: emptyBrand }).title).toBe(
      'Review answers and confirm WhatsApp',
    );
  });

  test.each([
    [emptyBrand, 'Choose the store name'],
    [{ ...emptyBrand, name: 'Test store' }, 'Create or upload the logo'],
    [{ ...emptyBrand, name: 'Test store', logoImage: 'saved.png' }, 'Write the store description'],
    [
      { ...emptyBrand, name: 'Test store', logoImage: 'saved.png', description: 'Saved text' },
      'Review and confirm the brand',
    ],
  ])('resumes the saved brand choices: %j', (brand, title) => {
    expect(currentStoreStep({ phase: 2, answers: {}, brand }).title).toBe(title);
  });

  test('shows the missing-logo recovery even after the brand phase', () => {
    expect(
      currentStoreStep({
        phase: 6,
        answers: {},
        brand: { ...emptyBrand, name: 'Test store', completedAt: new Date() },
      }).title,
    ).toBe('Create the missing logo');
  });

  test('keeps the initial conversation first when a legacy brand has no logo', () => {
    expect(
      currentStoreStep({
        phase: 1,
        answers: {},
        brand: { ...emptyBrand, completedAt: new Date() },
      }).detail,
    ).toBe(ONBOARDING_QUESTIONS[0].ask);
  });

  test.each([5, 6, 7])('does not imply that pending phase %i is implemented', (phase) => {
    expect(currentStoreStep({ phase, answers: {}, brand: emptyBrand }).title).toBe('Coming soon');
  });
});

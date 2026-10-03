import { describe, expect, test } from 'bun:test';
import { ONBOARDING_QUESTIONS, type OnboardingAnswers } from '@/config/onboarding';
import {
  canOpen,
  findQuestion,
  nextStep,
  previousPath,
  resumeStep,
  REVIEW_STEP,
  stepPath,
  stepLabel,
  stepProgress,
  stepTitle,
  STEPS,
  WHATSAPP_STEP,
} from './steps';
import { ALL_ANSWERED } from './test-fixtures';

describe('perguntas', () => {
  test('ids únicos e que servem de endereço', () => {
    const ids = ONBOARDING_QUESTIONS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+$/);
  });

  test('opções únicas em cada pergunta e máximo coerente', () => {
    for (const item of ONBOARDING_QUESTIONS) {
      if (!('options' in item)) continue;
      const labels = item.options.map((option) => option.label);
      expect(new Set(labels).size).toBe(labels.length);
      if (item.kind === 'multi') expect(item.max).toBeLessThanOrEqual(labels.length);
    }
  });
});

describe('etapas', () => {
  test('ordem: perguntas, revisão, WhatsApp', () => {
    expect(findQuestion(REVIEW_STEP)).toBeUndefined();
    expect(STEPS.at(-2)).toBe(REVIEW_STEP);
    expect(STEPS.at(-1)).toBe(WHATSAPP_STEP);
    expect(nextStep('toque')).toBe(REVIEW_STEP);
    expect(nextStep(REVIEW_STEP)).toBe(WHATSAPP_STEP);
  });

  test('retoma na primeira pergunta sem resposta', () => {
    expect(resumeStep({})).toBe('vendas');
    expect(resumeStep({ vendas: 'Nunca vendi', dificuldade: 'Medo de errar' })).toBe('motivacao');
    expect(resumeStep(ALL_ANSWERED)).toBe(REVIEW_STEP);
    // Nome "a equipe sugere" (null) e toque pulado ('') contam como respondidos.
    expect(resumeStep({ ...ALL_ANSWERED, nome: null })).toBe(REVIEW_STEP);
  });

  test('não deixa pular perguntas nem ir pra revisão antes da hora', () => {
    const partial: OnboardingAnswers = { vendas: 'Nunca vendi' };
    expect(canOpen('vendas', partial)).toBe(true);
    expect(canOpen('motivacao', partial)).toBe(true);
    expect(canOpen('dificuldade', partial)).toBe(false);
    expect(canOpen(REVIEW_STEP, partial)).toBe(false);
    expect(canOpen(WHATSAPP_STEP, partial)).toBe(false);
    expect(canOpen(WHATSAPP_STEP, ALL_ANSWERED)).toBe(true);
  });

  test('voltar: etapa anterior, revisão quando editando, área na primeira', () => {
    expect(previousPath('vendas')).toBe('/loja-pronta');
    expect(previousPath('motivacao')).toBe(stepPath('vendas'));
    expect(previousPath('cor', { editing: true })).toBe(stepPath(REVIEW_STEP));
    expect(stepPath('cor', { editing: true })).toBe('/loja-pronta/conversa/cor?editar=1');
  });

  test('barra de progresso: a conversa inteira, etapa a etapa, e a parte de cada uma', () => {
    expect(stepProgress('vendas')).toEqual({ part: 0, progress: 1 / STEPS.length });
    expect(stepProgress('tempo').part).toBe(0);
    expect(stepProgress('nome').part).toBe(1);
    expect(stepProgress(REVIEW_STEP).part).toBe(2);
    expect(stepProgress(WHATSAPP_STEP)).toEqual({ part: 2, progress: 1 });
  });
});

describe('stepTitle e stepLabel', () => {
  test('título da aba completo, topo curto', () => {
    expect(stepTitle('vendas')).toBe('Pergunta 1 de 10');
    expect(stepLabel('vendas')).toBe('1 de 10');
    expect(stepTitle(REVIEW_STEP)).toBe('Revisão');
    expect(stepLabel(WHATSAPP_STEP)).toBe('Último passo');
  });
});

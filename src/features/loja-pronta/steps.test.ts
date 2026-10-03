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
  stepHeader,
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
    // Nome "ainda não decidi" (null) e toque pulado ('') contam como respondidos.
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

  test('topo: "Pergunta N de 10" e tracinhos cheios até a atual', () => {
    expect(stepHeader('vendas')).toEqual({ label: 'Pergunta 1 de 10', filled: 1, total: 10 });
    expect(stepHeader('tempo')).toMatchObject({ label: 'Pergunta 5 de 10', filled: 5 });
    expect(stepHeader('sentimento').label).toBe('Pergunta 9 de 10 · falta só 1');
    expect(stepHeader('toque').label).toBe('Última pergunta');
    expect(stepHeader(REVIEW_STEP)).toEqual({
      label: 'Revisão das respostas',
      filled: 10,
      total: 10,
    });
    expect(stepHeader(WHATSAPP_STEP).label).toBe('Último passo');
  });
});

describe('stepTitle', () => {
  test('título da aba', () => {
    expect(stepTitle('vendas')).toBe('Pergunta 1 de 10');
    expect(stepTitle(REVIEW_STEP)).toBe('Revisão');
    expect(stepTitle(WHATSAPP_STEP)).toBe('Último passo');
  });
});

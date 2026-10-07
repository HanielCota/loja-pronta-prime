import { describe, expect, test } from 'bun:test';
import { ONBOARDING_QUESTIONS, type OnboardingAnswers } from '@/config/onboarding';
import {
  BRAND_INTRO_STEP,
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
  test('não oferece categorias provisórias como se fossem produtos do fornecedor', () => {
    expect(ONBOARDING_QUESTIONS.some((item) => String(item.id) === 'categorias')).toBe(false);
  });
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
    expect(resumeStep({ vendas: 'Nunca vendi', estilo: 'Delicado' })).toBe('cor');
    expect(resumeStep(ALL_ANSWERED)).toBe(REVIEW_STEP);
    // Toque pulado ('') conta como respondido.
    expect(resumeStep({ ...ALL_ANSWERED, toque: '' })).toBe(REVIEW_STEP);
  });

  test('não deixa pular perguntas nem ir pra revisão antes da hora', () => {
    const partial: OnboardingAnswers = { vendas: 'Nunca vendi' };
    expect(canOpen('vendas', partial)).toBe(true);
    expect(canOpen('estilo', partial)).toBe(true);
    expect(canOpen(REVIEW_STEP, partial)).toBe(false);
    expect(canOpen(WHATSAPP_STEP, partial)).toBe(false);
    expect(canOpen(WHATSAPP_STEP, ALL_ANSWERED)).toBe(true);
  });

  test('voltar: etapa anterior, revisão quando editando, área na primeira', () => {
    expect(previousPath('vendas')).toBe('/loja-pronta');
    expect(previousPath(BRAND_INTRO_STEP)).toBe(stepPath('vendas'));
    expect(previousPath('cor', { editing: true })).toBe(stepPath(REVIEW_STEP));
    expect(stepPath('cor', { editing: true })).toBe('/loja-pronta/conversa/cor?editar=1');
  });

  test('topo: "Pergunta N de 5" e tracinhos cheios até a atual', () => {
    expect(stepHeader('vendas')).toEqual({ label: 'Pergunta 1 de 5', filled: 1, total: 5 });
    expect(stepHeader('estilo')).toMatchObject({ label: 'Pergunta 2 de 5', filled: 2 });
    expect(stepHeader('sentimento').label).toBe('Pergunta 4 de 5 · falta só 1');
    expect(stepHeader('toque').label).toBe('Última pergunta');
    expect(stepHeader(REVIEW_STEP)).toEqual({
      label: 'Revisão das respostas',
      filled: 5,
      total: 5,
    });
    expect(stepHeader(WHATSAPP_STEP).label).toBe('Último passo');
  });
});

describe('stepTitle', () => {
  test('título da aba', () => {
    expect(stepTitle('vendas')).toBe('Pergunta 1 de 5');
    expect(stepTitle(REVIEW_STEP)).toBe('Revisão');
    expect(stepTitle(WHATSAPP_STEP)).toBe('Último passo');
  });
});

describe('passagem pra marca', () => {
  test('vem entre as perguntas sobre ela e as da marca, sem contar como pergunta', () => {
    expect(nextStep('vendas')).toBe(BRAND_INTRO_STEP);
    expect(nextStep(BRAND_INTRO_STEP)).toBe('estilo');
    expect(previousPath('estilo')).toBe(stepPath(BRAND_INTRO_STEP));
    expect(stepTitle(BRAND_INTRO_STEP)).toBe('Agora, a sua marca');
    expect(stepHeader(BRAND_INTRO_STEP).filled).toBe(stepHeader('vendas').filled);
    expect(stepTitle('estilo')).toBe(`Pergunta 2 de ${ONBOARDING_QUESTIONS.length}`);
  });

  test('abre junto com a primeira pergunta da marca (nunca é onde ela "parou")', () => {
    const { estilo: _estilo, cor: _cor, sentimento: _s, toque: _t, ...voce } = ALL_ANSWERED;
    expect(resumeStep(voce)).toBe('estilo');
    expect(canOpen(BRAND_INTRO_STEP, voce)).toBe(true);
    expect(canOpen(BRAND_INTRO_STEP, {})).toBe(false);
  });
});

import { describe, expect, test } from 'bun:test';
import {
  ONBOARDING_QUESTIONS,
  PERSONAL_TOUCH_MAX,
  STORE_NAME_MAX,
  type OnboardingAnswers,
} from '@/config/onboarding';
import {
  answerText,
  canOpen,
  findQuestion,
  formatWhatsapp,
  nextStep,
  parseAnswer,
  parseWhatsapp,
  previousPath,
  resumeStep,
  REVIEW_STEP,
  stepPath,
  stepProgress,
  STEPS,
  WHATSAPP_STEP,
} from './steps';

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of [value].flat()) data.append(key, item);
  }
  return data;
}

function question(id: string) {
  const found = ONBOARDING_QUESTIONS.find((item) => item.id === id);
  if (!found) throw new Error(`pergunta ${id} não existe`);
  return found;
}

/** Todas as perguntas respondidas (com respostas válidas). */
const ALL_ANSWERED: OnboardingAnswers = {
  vendas: 'Nunca vendi',
  motivacao: ['Renda extra'],
  dificuldade: 'Medo de errar',
  categorias: ['Beleza'],
  tempo: 'Até 3 horas',
  nome: 'Ateliê',
  estilo: 'Delicado',
  cor: 'Rosa',
  sentimento: ['Alegres'],
  toque: '',
};

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

describe('parseAnswer', () => {
  test('escolha única: aceita só uma das opções', () => {
    const vendas = question('vendas');
    expect(parseAnswer(vendas, form({ value: 'Nunca vendi' }))).toEqual({
      ok: true,
      value: 'Nunca vendi',
    });
    expect(parseAnswer(vendas, form({ value: 'Inventada' })).ok).toBe(false);
    expect(parseAnswer(vendas, form({})).ok).toBe(false);
  });

  test('várias: na ordem das opções, sem repetir, até o máximo', () => {
    const categorias = question('categorias');
    expect(parseAnswer(categorias, form({ value: ['Pets', 'Beleza', 'Pets'] }))).toEqual({
      ok: true,
      value: ['Beleza', 'Pets'],
    });
    expect(parseAnswer(categorias, form({})).ok).toBe(false);
    expect(parseAnswer(categorias, form({ value: ['Beleza', 'Inventada'] })).ok).toBe(false);
    const tooMany = parseAnswer(
      categorias,
      form({ value: ['Beleza', 'Pets', 'Cozinha', 'Infantil'] }),
    );
    expect(tooMany).toEqual({ ok: false, error: 'Escolha no máximo 3.' });
  });

  test('nome: texto limpo, "ainda não sei" e limites', () => {
    const nome = question('nome');
    expect(parseAnswer(nome, form({ value: '  Ateliê   da  Ana ' }))).toEqual({
      ok: true,
      value: 'Ateliê da Ana',
    });
    expect(parseAnswer(nome, form({ unknown: '1' }))).toEqual({ ok: true, value: null });
    // "Ainda não sei" vale mesmo se sobrou texto no campo.
    expect(parseAnswer(nome, form({ value: 'x', unknown: '1' }))).toEqual({
      ok: true,
      value: null,
    });
    expect(parseAnswer(nome, form({ value: '   ' })).ok).toBe(false);
    expect(parseAnswer(nome, form({ value: 'a'.repeat(STORE_NAME_MAX + 1) })).ok).toBe(false);
  });

  test('cor: uma das cores ou "Deixo com a equipe"', () => {
    const cor = question('cor');
    expect(parseAnswer(cor, form({ value: 'Deixo com a equipe' })).ok).toBe(true);
    expect(parseAnswer(cor, form({ value: '#ff0000' })).ok).toBe(false);
  });

  test('toque pessoal: opcional, com limite', () => {
    const toque = question('toque');
    expect(parseAnswer(toque, form({}))).toEqual({ ok: true, value: '' });
    expect(parseAnswer(toque, form({ value: ' uma flor ' }))).toEqual({
      ok: true,
      value: 'uma flor',
    });
    expect(parseAnswer(toque, form({ value: 'a'.repeat(PERSONAL_TOUCH_MAX + 1) })).ok).toBe(false);
  });
});

describe('parseWhatsapp e formatWhatsapp', () => {
  test('aceita qualquer formato com DDD e guarda só os dígitos', () => {
    expect(parseWhatsapp('(11) 98765-4321')).toBe('11987654321');
    expect(parseWhatsapp('+55 11 98765 4321')).toBe('11987654321');
    expect(parseWhatsapp('5511987654321')).toBe('11987654321');
    expect(parseWhatsapp('11 3456-7890')).toBe('1134567890');
  });

  test('recusa número curto, longo ou com DDD começando em 0', () => {
    expect(parseWhatsapp('98765-4321')).toBeUndefined();
    expect(parseWhatsapp('119876543210')).toBeUndefined();
    expect(parseWhatsapp('01198765432')).toBeUndefined();
    expect(parseWhatsapp('')).toBeUndefined();
  });

  test('formata celular e fixo', () => {
    expect(formatWhatsapp('11987654321')).toBe('(11) 98765-4321');
    expect(formatWhatsapp('1134567890')).toBe('(11) 3456-7890');
  });
});

describe('etapas', () => {
  test('ordem: perguntas, revisão, WhatsApp', () => {
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

  test('barra de progresso enche aos poucos em cada parte', () => {
    expect(stepProgress('vendas')).toEqual({ part: 0, progress: 0.2 });
    expect(stepProgress('tempo')).toEqual({ part: 0, progress: 1 });
    expect(stepProgress('nome')).toEqual({ part: 1, progress: 0.2 });
    expect(stepProgress(REVIEW_STEP)).toEqual({ part: 2, progress: 0.5 });
    expect(stepProgress(WHATSAPP_STEP)).toEqual({ part: 2, progress: 1 });
  });
});

describe('answerText', () => {
  test('texto da revisão', () => {
    const answers: OnboardingAnswers = {
      ...ALL_ANSWERED,
      nome: null,
      categorias: ['Beleza', 'Pets'],
    };
    expect(answerText(question('nome'), answers)).toBe('A equipe sugere');
    expect(answerText(question('toque'), answers)).toBe('Nada em especial');
    expect(answerText(question('categorias'), answers)).toBe('Beleza, Pets');
    expect(findQuestion(REVIEW_STEP)).toBeUndefined();
  });
});

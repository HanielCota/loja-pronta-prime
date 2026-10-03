import { describe, expect, test } from 'bun:test';
import { PERSONAL_TOUCH_MAX, STORE_NAME_MAX, type OnboardingAnswers } from '@/config/onboarding';
import { answerText, cleanAnswers, parseAnswer, UNKNOWN_NAME } from './answers';
import { resumeStep } from './steps';
import { ALL_ANSWERED, form, question } from './test-fixtures';

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

  test('toque pessoal: quebra de linha do navegador (CRLF) conta 1, como no campo', () => {
    const toque = question('toque');
    // 300 caracteres no campo (quebra = 1), 350 no envio (quebra = CRLF).
    const crlf = 'linha\r\n'.repeat(50);
    const parsed = parseAnswer(toque, form({ value: crlf }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toBe('linha\n'.repeat(50).trim());
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

describe('cleanAnswers', () => {
  test('mantém respostas válidas como estão', () => {
    expect(cleanAnswers(ALL_ANSWERED)).toEqual(ALL_ANSWERED);
    expect(cleanAnswers({ nome: null })).toEqual({ nome: null });
  });

  test('descarta opção que saiu da lista; na múltipla, só ela sai', () => {
    const old: OnboardingAnswers = {
      vendas: 'Opção antiga',
      categorias: ['Beleza', 'Categoria removida'],
      sentimento: ['Removido'],
    };
    expect(cleanAnswers(old)).toEqual({ categorias: ['Beleza'] });
    // Sem resposta válida, a conversa volta a pedir a pergunta.
    expect(resumeStep(cleanAnswers({ ...ALL_ANSWERED, vendas: 'Opção antiga' }))).toBe('vendas');
  });

  test('descarta tipos errados e corta acima do máximo', () => {
    const odd = {
      vendas: ['Nunca vendi'],
      nome: 42,
      toque: null,
      categorias: ['Beleza', 'Pets', 'Cozinha', 'Infantil'],
    } as unknown as OnboardingAnswers;
    expect(cleanAnswers(odd)).toEqual({ categorias: ['Beleza', 'Pets', 'Cozinha'] });
  });
});

describe('answerText', () => {
  test('texto da revisão', () => {
    const answers: OnboardingAnswers = {
      ...ALL_ANSWERED,
      nome: null,
      categorias: ['Beleza', 'Pets'],
    };
    expect(answerText(question('nome'), answers)).toBe(`${UNKNOWN_NAME} (a equipe sugere)`);
    expect(answerText(question('toque'), answers)).toBe('Nada em especial');
    expect(answerText(question('categorias'), answers)).toBe('Beleza, Pets');
  });
});

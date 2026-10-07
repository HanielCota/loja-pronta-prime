import { describe, expect, test } from 'bun:test';
import { PERSONAL_TOUCH_MAX, type OnboardingAnswers } from '@/config/onboarding';
import { answerText, cleanAnswers, legacyStoreName, parseAnswer } from './answers';
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
    const sentimentos = question('sentimento');
    expect(
      parseAnswer(sentimentos, form({ value: ['Diversão', 'Confiança', 'Diversão'] })),
    ).toEqual({
      ok: true,
      value: ['Confiança', 'Diversão'],
    });
    expect(parseAnswer(sentimentos, form({})).ok).toBe(false);
    expect(parseAnswer(sentimentos, form({ value: ['Confiança', 'Inventada'] })).ok).toBe(false);
    const tooMany = parseAnswer(sentimentos, form({ value: ['Confiança', 'Diversão', 'Energia'] }));
    expect(tooMany).toEqual({ ok: false, error: 'Escolha no máximo 2.' });
  });

  test('cor: uma das cores, "Escolho depois" ou a cor que ela escolheu (#rrggbb)', () => {
    const cor = question('cor');
    expect(parseAnswer(cor, form({ value: 'Escolho depois' })).ok).toBe(true);
    expect(parseAnswer(cor, form({ value: '#FF0000' }))).toEqual({ ok: true, value: '#ff0000' });
    // "Outra cor" sem cor escolhida, ou uma cor inventada, não vale.
    expect(parseAnswer(cor, form({ value: 'Outra cor' }))).toEqual({
      ok: false,
      error: 'Escolha a sua cor.',
    });
    expect(parseAnswer(cor, form({ value: 'red' })).ok).toBe(false);
    expect(parseAnswer(cor, form({ value: '#ff00' })).ok).toBe(false);
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
  test('ignora categorias antigas sem catálogo confirmado, sem pedir outra resposta', () => {
    const cleaned = cleanAnswers({ ...ALL_ANSWERED, categorias: ['Beleza', 'Pets'] });
    expect(cleaned).toEqual(ALL_ANSWERED);
    expect(resumeStep(cleaned)).toBe('revisao');
  });
  test('mantém respostas válidas como estão', () => {
    expect(cleanAnswers(ALL_ANSWERED)).toEqual(ALL_ANSWERED);
  });

  test('a cor escolhida por ela (#rrggbb) vale; o nome da opção "Outra cor" sozinho, não', () => {
    expect(cleanAnswers({ cor: '#7a3cff' })).toEqual({ cor: '#7a3cff' });
    expect(cleanAnswers({ cor: 'Outra cor' })).toEqual({});
    expect(answerText(question('cor'), { cor: '#7a3cff' })).toBe('A cor que você escolheu');
  });

  test('descarta opção que saiu da lista; na múltipla, só ela sai', () => {
    const old: OnboardingAnswers = {
      vendas: 'Opção antiga',
      sentimento: ['Confiança', 'Categoria removida'],
    };
    expect(cleanAnswers(old)).toEqual({ sentimento: ['Confiança'] });
    // Sem resposta válida, a conversa volta a pedir a pergunta.
    expect(resumeStep(cleanAnswers({ ...ALL_ANSWERED, vendas: 'Opção antiga' }))).toBe('vendas');
  });

  test('descarta tipos errados e corta acima do máximo', () => {
    const odd = {
      vendas: ['Nunca vendi'],
      toque: null,
      sentimento: ['Confiança', 'Diversão', 'Energia'],
    } as unknown as OnboardingAnswers;
    expect(cleanAnswers(odd)).toEqual({ sentimento: ['Confiança', 'Diversão'] });
  });
});

describe('legacyStoreName', () => {
  test('o nome da conversa antiga, quando ela escreveu um', () => {
    expect(legacyStoreName({ nome: '  Ateliê da Ana ' })).toBe('Ateliê da Ana');
    // "Ainda não decidi" (null), vazio, tipo errado ou sem resposta: nada.
    expect(legacyStoreName({ nome: null })).toBeNull();
    expect(legacyStoreName({ nome: '  ' })).toBeNull();
    expect(legacyStoreName({ nome: 42 })).toBeNull();
    expect(legacyStoreName({ vendas: 'Nunca vendi' })).toBeNull();
    expect(legacyStoreName(null)).toBeNull();
  });

  test('cleanAnswers não devolve o nome antigo como resposta', () => {
    expect(cleanAnswers({ ...ALL_ANSWERED, nome: 'Ateliê' } as OnboardingAnswers)).toEqual(
      ALL_ANSWERED,
    );
  });
});

describe('answerText', () => {
  test('texto da revisão', () => {
    const answers: OnboardingAnswers = {
      ...ALL_ANSWERED,
      sentimento: ['Confiança', 'Diversão'],
    };
    expect(answerText(question('toque'), answers)).toBe('Nada em especial');
    expect(answerText(question('sentimento'), answers)).toBe('Confiança, Diversão');
  });
});

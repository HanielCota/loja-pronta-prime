import { describe, expect, test } from 'bun:test';
import { PERSONAL_TOUCH_MAX } from '@/config/onboarding';
import {
  choiceCounter,
  fieldNote,
  maxChoices,
  missingAnswer,
  questionHelp,
  submitButton,
  type Draft,
} from './answer-rules';
import { question } from './test-fixtures';

const EMPTY: Draft = { selected: [], unknownName: false, text: '' };

describe('missingAnswer', () => {
  test('escolhas sem nada marcado avisam; com algo, não', () => {
    expect(missingAnswer(question('vendas'), EMPTY)).toBe('Escolha uma opção.');
    expect(missingAnswer(question('motivacao'), EMPTY)).toBe('Escolha pelo menos uma opção.');
    expect(missingAnswer(question('cor'), { ...EMPTY, selected: ['Rosa'] })).toBeUndefined();
  });

  test('nome: texto ou "ainda não decidi"; toque pessoal é opcional', () => {
    expect(missingAnswer(question('nome'), { ...EMPTY, text: '  ' })).toMatch(/nome da loja/);
    expect(missingAnswer(question('nome'), { ...EMPTY, unknownName: true })).toBeUndefined();
    expect(missingAnswer(question('toque'), EMPTY)).toBeUndefined();
  });
});

describe('escolhas', () => {
  test('o máximo de escolhas vem da pergunta', () => {
    expect(maxChoices(question('categorias'))).toBe(3);
    expect(maxChoices(question('vendas'))).toBe(1);
  });

  test('contador: chips mostram quantas; no limite (menor que as opções), avisa', () => {
    expect(choiceCounter(question('categorias'), 1)).toBe('1 de 3 escolhidas');
    expect(choiceCounter(question('categorias'), 3)).toMatch(/desmarque uma/);
    // Motivação deixa marcar todas: nada de "desmarque".
    expect(choiceCounter(question('motivacao'), 5)).toBe('');
    expect(choiceCounter(question('vendas'), 1)).toBe('');
  });
});

describe('questionHelp, fieldNote e submitButton', () => {
  test('ajuda: a da pergunta, ou o aviso de confirmar no botão', () => {
    expect(questionHelp(question('vendas'), false)).toMatch(/Continuar/);
    expect(questionHelp(question('vendas'), true)).toMatch(/Salvar e voltar/);
    expect(questionHelp(question('cor'), false)).toMatch(/Continuar/);
    expect(questionHelp(question('motivacao'), false)).toBe(
      'Pode marcar mais de uma. Quando terminar, toque em Continuar.',
    );
  });

  test('nota: quanto texto cabe', () => {
    expect(fieldNote(question('toque'), { ...EMPTY, text: 'abc' })).toBe(
      `3 de ${PERSONAL_TOUCH_MAX} caracteres`,
    );
    expect(fieldNote(question('vendas'), EMPTY)).toBe('');
    expect(fieldNote(question('motivacao'), EMPTY)).toBe('');
  });

  test('botão: cinza sem resposta, "Pular" no opcional vazio, "Salvar e voltar" editando', () => {
    expect(submitButton(question('vendas'), EMPTY, false)).toEqual({
      ready: false,
      label: 'Continuar',
    });
    expect(submitButton(question('toque'), EMPTY, false)).toEqual({ ready: false, label: 'Pular' });
    expect(submitButton(question('toque'), EMPTY, true)).toEqual({
      ready: true,
      label: 'Salvar e voltar',
    });
    expect(submitButton(question('toque'), { ...EMPTY, text: 'flor' }, false).ready).toBe(true);
    expect(submitButton(question('vendas'), { ...EMPTY, selected: ['Nunca vendi'] }, true)).toEqual(
      { ready: true, label: 'Salvar e voltar' },
    );
  });
});

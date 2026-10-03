import { describe, expect, test } from 'bun:test';
import { PERSONAL_TOUCH_MAX } from '@/config/onboarding';
import {
  advancesOnTap,
  choiceCounter,
  fieldNote,
  maxChoices,
  missingAnswer,
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
  test('só a escolha única avança ao tocar; o máximo vem da pergunta', () => {
    expect(advancesOnTap(question('vendas'))).toBe(true);
    expect(advancesOnTap(question('cor'))).toBe(true);
    expect(advancesOnTap(question('motivacao'))).toBe(false);
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

describe('fieldNote e submitButton', () => {
  test('nota: avanço ao tocar, ou quanto texto cabe', () => {
    expect(fieldNote(question('vendas'), EMPTY, false)).toMatch(/próxima pergunta/);
    expect(fieldNote(question('vendas'), EMPTY, true)).toMatch(/volta pra revisão/);
    expect(fieldNote(question('toque'), { ...EMPTY, text: 'abc' }, false)).toBe(
      `3 de ${PERSONAL_TOUCH_MAX} caracteres`,
    );
    expect(fieldNote(question('motivacao'), EMPTY, false)).toBe('');
  });

  test('botão: cinza sem resposta, "Pular" no opcional vazio, "Salvar e voltar" editando', () => {
    expect(submitButton(question('vendas'), EMPTY, false)).toEqual({
      ready: false,
      label: 'Continuar',
    });
    expect(submitButton(question('toque'), EMPTY, false)).toEqual({ ready: false, label: 'Pular' });
    expect(submitButton(question('toque'), { ...EMPTY, text: 'flor' }, false).ready).toBe(true);
    expect(submitButton(question('vendas'), { ...EMPTY, selected: ['Nunca vendi'] }, true)).toEqual(
      { ready: true, label: 'Salvar e voltar' },
    );
  });
});

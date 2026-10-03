import { describe, expect, test } from 'bun:test';
import { conversationStatus, displayedPhase } from './store-phase';

describe('displayedPhase', () => {
  test('conversa enviada com a loja ainda na fase 1: ela já vê a fase 2', () => {
    expect(displayedPhase(1, true)).toBe(2);
    expect(displayedPhase(1, false)).toBe(1);
    expect(displayedPhase(3, true)).toBe(3);
  });
});

describe('conversationStatus', () => {
  test('não começou, em andamento e enviada', () => {
    expect(conversationStatus({ answers: {}, completedAt: null })).toBe('nao-comecou');
    expect(conversationStatus({ answers: { vendas: 'Nunca vendi' }, completedAt: null })).toBe(
      'em-andamento',
    );
    expect(conversationStatus({ answers: {}, completedAt: new Date() })).toBe('enviada');
  });
});

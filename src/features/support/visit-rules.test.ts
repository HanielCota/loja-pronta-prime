import { describe, expect, test } from 'bun:test';
import {
  BLOCKED_DURING_VISIT,
  blockedMessage,
  redirectTargetOf,
  visitRuleFor,
} from './visit-rules';

describe('regras da visita', () => {
  test('ação bloqueada traz a recusa em português', () => {
    expect(visitRuleFor('changePassword')).toEqual({
      kind: 'blocked',
      message: 'Não é possível trocar a senha dela enquanto você usa a conta da aluna.',
    });
  });

  test('toda recusa é uma frase completa, com o motivo depois', () => {
    expect(blockedMessage('openTicket')).toBe(
      'Não é possível abrir chamado ou escrever como ela enquanto você usa a conta da aluna. Responda pelo painel do suporte.',
    );
    for (const name of Object.keys(BLOCKED_DURING_VISIT)) {
      const message = blockedMessage(name) ?? '';
      expect(message).toMatch(
        /^Não é possível [^.()]+ enquanto você usa a conta da aluna\.( [^()]+\.)?$/,
      );
    }
  });

  test('nomes herdados de Object não viram ação bloqueada', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(blockedMessage(name)).toBeNull();
      expect(visitRuleFor(name).kind).toBe('recorded');
    }
  });

  test('marcas pequenas são silenciosas, leituras não entram no registro', () => {
    expect(visitRuleFor('markMyTicketRead').kind).toBe('quiet');
    expect(visitRuleFor('recordPresence').kind).toBe('quiet');
    expect(visitRuleFor('calculatePrice').kind).toBe('read');
    expect(visitRuleFor('signOut').kind).toBe('ends_visit');
  });

  test('o resto é permitido e registrado', () => {
    expect(visitRuleFor('saveBrandName').kind).toBe('recorded');
  });
});

describe('destino de um redirect', () => {
  test('lê o caminho do digest do Next', () => {
    expect(redirectTargetOf({ digest: 'NEXT_REDIRECT;replace;/sll/plano?resultado=ok;307;' })).toBe(
      '/sll/plano?resultado=ok',
    );
  });

  test('outro erro não é redirect', () => {
    expect(redirectTargetOf(new Error('x'))).toBeNull();
    expect(redirectTargetOf({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })).toBeNull();
    expect(redirectTargetOf(null)).toBeNull();
  });
});

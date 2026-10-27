import { describe, expect, test } from 'bun:test';
import { redirectTargetOf, visitRuleFor } from './visit-rules';

describe('regras da visita', () => {
  test('ação bloqueada traz a recusa em português', () => {
    expect(visitRuleFor('changePassword')).toEqual({
      kind: 'blocked',
      message: 'Não é possível trocar a senha da aluna durante o acesso à conta da aluna.',
    });
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

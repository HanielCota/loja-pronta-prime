import { describe, expect, test } from 'bun:test';
import { adminSectionFor } from './admin-section';

describe('adminSectionFor', () => {
  test('a inicial é a visão geral, ou a área do conteúdo pedida', () => {
    expect(adminSectionFor('/admin', null)).toBe('overview');
    expect(adminSectionFor('/admin', 'method')).toBe('method');
    expect(adminSectionFor('/admin', 'outra')).toBe('overview');
  });

  test('as páginas de dentro marcam a seção delas', () => {
    expect(adminSectionFor('/admin/contas', null)).toBe('accounts');
    expect(adminSectionFor('/admin/contas/123/etapa', null)).toBe('accounts');
    expect(adminSectionFor('/admin/assistente', null)).toBe('assistant');
    expect(adminSectionFor('/admin/online', 'method')).toBe('online');
  });

  test('os contatos ficam fora de /admin e marcam Contatos', () => {
    expect(adminSectionFor('/leads', null)).toBe('leads');
    expect(adminSectionFor('/leads/importar', null)).toBe('leads');
  });

  test('a prévia da aula não tem seção', () => {
    expect(adminSectionFor('/admin/preview/abc', null)).toBeUndefined();
    expect(adminSectionFor('/leadsx', null)).toBeUndefined();
  });
});

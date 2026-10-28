import { describe, expect, test } from 'bun:test';
import { resolvePostLoginPath } from './post-login';

describe('resolvePostLoginPath', () => {
  test('sem destino pedido, vai pro início', () => {
    expect(resolvePostLoginPath(undefined)).toBe('/');
  });

  test('respeita o destino interno pedido', () => {
    expect(resolvePostLoginPath('/suporte/novo')).toBe('/suporte/novo');
  });

  test('recusa destino de fora', () => {
    expect(resolvePostLoginPath('https://exemplo.invalid/roubo')).toBe('/');
  });

  test('senha temporária passa antes pelo primeiro acesso', () => {
    expect(resolvePostLoginPath('/sll', { mustChangePassword: true })).toBe(
      '/primeiro-acesso?next=%2Fsll',
    );
  });

  test('equipe sem produto entra pelo painel do cargo', () => {
    expect(resolvePostLoginPath(undefined, { staffPanelPath: '/admin/chamados' })).toBe(
      '/admin/chamados',
    );
  });

  test('o destino pedido vence o atalho da equipe', () => {
    expect(resolvePostLoginPath('/suporte', { staffPanelPath: '/admin/chamados' })).toBe(
      '/suporte',
    );
  });

  test('a senha temporária vem antes do painel', () => {
    expect(
      resolvePostLoginPath(undefined, { mustChangePassword: true, staffPanelPath: '/admin' }),
    ).toBe('/primeiro-acesso');
  });
});

import { describe, expect, test } from 'bun:test';
import {
  startVisitSchema,
  visitDestination,
  visitRefusalReason,
  type VisitTarget,
} from './visit-target';

const student: VisitTarget = {
  id: 'aluna',
  role: 'user',
  banned: false,
  mustChangePassword: false,
};

describe('quem pode ser acessada', () => {
  test('aluna com senha criada pode', () => {
    expect(visitRefusalReason(student, 'admin')).toBeNull();
    expect(visitRefusalReason({ ...student, role: null }, 'admin')).toBeNull();
  });

  test('conta da equipe nunca, mesmo junto de outro papel', () => {
    for (const role of [
      'admin',
      'support_agent',
      'support_supervisor',
      'user,support_agent',
      'user, admin',
    ]) {
      expect(visitRefusalReason({ ...student, role }, 'admin')).toBe(
        'Contas da equipe não podem ser acessadas.',
      );
    }
  });

  test('nem a própria conta, nem conta bloqueada, nem sem senha criada', () => {
    expect(visitRefusalReason(student, 'aluna')).toBe('Essa é a sua própria conta.');
    expect(visitRefusalReason({ ...student, banned: true }, 'admin')).toBe(
      'A conta está bloqueada.',
    );
    expect(visitRefusalReason({ ...student, mustChangePassword: true }, 'admin')).toBe(
      'A aluna ainda não criou a senha.',
    );
    expect(visitRefusalReason({ ...student, mustChangePassword: null }, 'admin')).toBe(
      'A aluna ainda não criou a senha.',
    );
    expect(visitRefusalReason(null, 'admin')).toBe('Conta não encontrada.');
  });
});

describe('página de início da visita', () => {
  test('aceita só páginas da área da aluna', () => {
    expect(visitDestination('/sll/aula/abc-123')).toBe('/sll/aula/abc-123');
    expect(visitDestination('/suporte/42')).toBe('/suporte/42');
    expect(visitDestination('/loja-pronta')).toBe('/loja-pronta');
  });

  test('qualquer outra coisa abre no início', () => {
    for (const raw of [
      null,
      '',
      '//evil.com',
      'https://evil.com',
      '/admin/contas',
      '/sllx',
      '/sll?x=1',
      '/sll\\..',
      '/sll//x',
    ]) {
      expect(visitDestination(raw)).toBe('/');
    }
  });

  test('o formulário valida o id e o número do chamado', () => {
    expect(startVisitSchema.safeParse({ aluna: 'id', numero: '12' }).data?.numero).toBe(12);
    expect(startVisitSchema.safeParse({ aluna: '' }).success).toBe(false);
    expect(startVisitSchema.safeParse({ aluna: 'id', numero: '-1' }).success).toBe(false);
  });
});

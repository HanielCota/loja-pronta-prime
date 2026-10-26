import { describe, expect, test } from 'bun:test';
import { NAME_MAX_LENGTH } from '@/features/auth/schemas';
import { parseAccountEdit, withAdminRole } from './account-edit';

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = {
  name: '  Maria Souza ',
  preferredName: '',
  email: ' Maria@Email.com ',
  role: 'student',
  mustChangePassword: 'no',
};

describe('parseAccountEdit', () => {
  test('limpa os campos e normaliza o email', () => {
    expect(parseAccountEdit(form(valid))).toEqual({
      name: 'Maria Souza',
      preferredName: null,
      email: 'maria@email.com',
      admin: false,
      mustChangePassword: false,
    });
  });

  test('lê a função admin e a troca de senha', () => {
    const parsed = parseAccountEdit(
      form({ ...valid, role: 'admin', mustChangePassword: 'yes', preferredName: 'Mari' }),
    );
    expect(parsed?.admin).toBe(true);
    expect(parsed?.mustChangePassword).toBe(true);
    expect(parsed?.preferredName).toBe('Mari');
  });

  test('recusa email inválido, nome curto e função desconhecida', () => {
    expect(parseAccountEdit(form({ ...valid, email: 'maria' }))).toBeNull();
    expect(parseAccountEdit(form({ ...valid, name: 'M' }))).toBeNull();
    expect(parseAccountEdit(form({ ...valid, role: 'owner' }))).toBeNull();
  });

  test('o nome preferido tem o mesmo teto do perfil da aluna', () => {
    const at = 'a'.repeat(NAME_MAX_LENGTH);
    expect(parseAccountEdit(form({ ...valid, preferredName: at }))?.preferredName).toBe(at);
    expect(parseAccountEdit(form({ ...valid, preferredName: ` ${at} ` }))?.preferredName).toBe(at);
    expect(parseAccountEdit(form({ ...valid, preferredName: `${at}a` }))).toBeNull();
  });
});

describe('withAdminRole', () => {
  test('liga e desliga só a função admin', () => {
    expect(withAdminRole(null, true)).toBe('admin');
    expect(withAdminRole('admin', false)).toBeNull();
    expect(withAdminRole('admin,support', false)).toBe('support');
    expect(withAdminRole('support', true)).toBe('admin,support');
    expect(withAdminRole('user', false)).toBeNull();
  });
});

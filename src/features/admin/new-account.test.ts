import { describe, expect, test } from 'bun:test';
import { parseNewAccount } from './new-account';

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

const valid = {
  name: '  Maria Souza ',
  email: ' Maria@Email.com ',
  role: 'student',
  access: 'email',
  'termMode-sll': 'purchase',
  'termDate-sll': new Date().toISOString().slice(0, 10),
  'termMode-loja-pronta': 'purchase',
  'termDate-loja-pronta': new Date().toISOString().slice(0, 10),
};

describe('parseNewAccount', () => {
  test('aluna com convite por email e os dois produtos', () => {
    expect(parseNewAccount(form({ ...valid, products: ['sll', 'loja-pronta'] }))).toEqual({
      ok: true,
      account: {
        name: 'Maria Souza',
        email: 'maria@email.com',
        admin: false,
        products: ['sll', 'loja-pronta'],
        access: 'email',
        password: null,
        expirations: { sll: expect.any(Date), 'loja-pronta': expect.any(Date) },
      },
    });
  });

  test('admin com senha temporária e sem produto', () => {
    const result = parseNewAccount(
      form({ ...valid, role: 'admin', access: 'password', password: 'senha-temporaria' }),
    );
    expect(result).toMatchObject({
      ok: true,
      account: { admin: true, products: [], access: 'password', password: 'senha-temporaria' },
    });
  });

  test('ignora produtos que não existem', () => {
    const result = parseNewAccount(form({ ...valid, products: ['sll', 'curso-falso'] }));
    expect(result.ok && result.account.products).toEqual(['sll']);
  });

  test('a senha só é pedida quando ela é a forma de entrar', () => {
    expect(parseNewAccount(form({ ...valid, password: '1' })).ok).toBe(true);
    expect(parseNewAccount(form({ ...valid, access: 'password', password: 'curta' }))).toEqual({
      ok: false,
      errors: { password: 'A senha temporária precisa ter de 8 a 128 caracteres.' },
    });
  });

  test('aponta cada campo que precisa de correção', () => {
    expect(parseNewAccount(form({ ...valid, name: 'M', email: 'maria' }))).toEqual({
      ok: false,
      errors: {
        name: 'Escreva o nome completo (2 a 120 letras).',
        email: 'Escreva um email válido.',
      },
    });
    expect(parseNewAccount(form({ ...valid, role: 'dona' }))).toEqual({
      ok: false,
      errors: { form: 'Confira as escolhas e tente de novo.' },
    });
  });
});

test('selected products require an evidenced term independently', () => {
  expect(parseNewAccount(form({ ...valid, products: ['sll'], 'termDate-sll': '' }))).toEqual({
    ok: false,
    errors: { terms: 'Escolha o tipo de prazo e informe uma data válida.' },
  });
  expect(parseNewAccount(form({ ...valid, products: [] })).ok).toBe(true);
});

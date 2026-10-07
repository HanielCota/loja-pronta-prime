import { describe, expect, test } from 'bun:test';
import { parseHotmartSettings } from './settings-input';

function form(sll = 'sll-code', store = 'store-code', token = '') {
  const value = new FormData();
  value.set('sllCode', sll);
  value.set('storeCode', store);
  value.set('token', token);
  return value;
}

describe('configuração de produtos Hotmart', () => {
  test('rejeita o mesmo código, inclusive com espaços nas pontas', () => {
    expect(parseHotmartSettings(form(' same-code ', 'same-code'))).toMatchObject({ ok: false });
  });
  test('aceita códigos distintos e token vazio para manter o que já existe', () => {
    expect(parseHotmartSettings(form(' sll-code ', ' store-code ', '  '))).toEqual({
      ok: true,
      value: { sllCode: 'sll-code', storeCode: 'store-code', token: '' },
    });
  });
  test('confere os limites e rejeita arquivos no lugar de códigos', () => {
    expect(parseHotmartSettings(form('', 'store-code'))).toMatchObject({ ok: false });
    expect(parseHotmartSettings(form('x'.repeat(151), 'store-code'))).toMatchObject({ ok: false });
    expect(parseHotmartSettings(form('sll-code', 'store-code', 'short'))).toMatchObject({
      ok: false,
    });
    expect(parseHotmartSettings(form('sll-code', 'store-code', 'x'.repeat(501)))).toMatchObject({
      ok: false,
    });
    const invalid = form();
    invalid.set('sllCode', new File(['x'], 'code.txt'));
    expect(parseHotmartSettings(invalid)).toMatchObject({ ok: false });
  });
});

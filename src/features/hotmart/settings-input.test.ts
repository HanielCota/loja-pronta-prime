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
  test('pasted invisible characters are removed from product codes', () => {
    expect(parseHotmartSettings(form('\u200Bsll-code\u00A0', 'store-code\uFEFF'))).toEqual({
      ok: true,
      value: { token: '', sllCode: 'sll-code', storeCode: 'store-code' },
    });
    for (const blank of ['\u200B', '\u00A0 ', ''])
      expect(parseHotmartSettings(form(blank, 'store-code'))).toMatchObject({ ok: false });
    expect(parseHotmartSettings(form('same\u200B', 'same'))).toMatchObject({ ok: false });
  });

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

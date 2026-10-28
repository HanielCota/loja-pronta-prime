import { describe, expect, test } from 'bun:test';
import { withNotice } from './send-notice';

describe('aviso do envio na URL', () => {
  test('sem aviso, a URL não muda', () => {
    expect(withNotice('/suporte/12#fim', null)).toBe('/suporte/12#fim');
  });

  test('vai antes da âncora', () => {
    expect(withNotice('/suporte/12#fim', 'a.png ficou de fora.')).toBe(
      '/suporte/12?aviso_envio=a.png%20ficou%20de%20fora.#fim',
    );
  });

  test('junta com parâmetros que já existem', () => {
    expect(withNotice('/suporte/12?enviado=1', 'x')).toBe('/suporte/12?enviado=1&aviso_envio=x');
  });
});

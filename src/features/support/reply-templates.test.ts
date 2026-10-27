import { describe, expect, test } from 'bun:test';
import { DEFAULT_REPLY_TEMPLATES, fillTemplate } from './reply-templates';

describe('respostas prontas', () => {
  test('troca os campos e usa o primeiro nome da aluna', () => {
    expect(
      fillTemplate('Oi, {aluna}! Sobre "{assunto}". {atendente}', {
        aluna: 'Maria Clara Souza',
        assunto: 'A aula não carrega',
        atendente: 'Ana',
      }),
    ).toBe('Oi, Maria! Sobre "A aula não carrega". Ana');
  });

  test('nenhuma resposta de fábrica fala de fornecedor ou loja do SellBridge', () => {
    for (const template of DEFAULT_REPLY_TEMPLATES) {
      expect(template.body.toLowerCase()).not.toContain('fornecedor');
      expect(template.body).not.toContain('{loja}');
    }
  });
});

import { describe, expect, test } from 'bun:test';
import {
  cleanWhatsapp,
  formatTypedWhatsapp,
  formatWhatsapp,
  parseWhatsapp,
  whatsappHint,
  whatsappLink,
} from './whatsapp';

describe('parseWhatsapp e formatWhatsapp', () => {
  test('aceita qualquer formato com DDD e guarda só os dígitos', () => {
    expect(parseWhatsapp('(11) 98765-4321')).toBe('11987654321');
    expect(parseWhatsapp('+55 11 98765 4321')).toBe('11987654321');
    expect(parseWhatsapp('5511987654321')).toBe('11987654321');
    // Fixo: a tela pede o número do WhatsApp (e avisa que parece fixo).
    expect(parseWhatsapp('11 3456-7890')).toBeUndefined();
  });

  test('recusa número curto ou longo', () => {
    expect(parseWhatsapp('98765-4321')).toBeUndefined();
    expect(parseWhatsapp('119876543210')).toBeUndefined();
    expect(parseWhatsapp('')).toBeUndefined();
  });

  test('tira o 0 e o código da operadora da frente', () => {
    expect(parseWhatsapp('011 98765-4321')).toBe('11987654321');
    expect(parseWhatsapp('0 21 11 98765-4321')).toBe('11987654321');
    expect(parseWhatsapp('0 15 11 98765-4321')).toBe('11987654321');
  });

  test('recusa número que não existe ou não é celular: DDD inválido, sem o 9, telefone fixo', () => {
    expect(parseWhatsapp('10 98765-4321')).toBeUndefined();
    expect(parseWhatsapp('20 98765-4321')).toBeUndefined();
    expect(parseWhatsapp('23 98765-4321')).toBeUndefined();
    expect(parseWhatsapp('11 8765-4321')).toBeUndefined();
    expect(parseWhatsapp('11 88765-4321')).toBeUndefined();
    // Fixo: a tela pede o número do WhatsApp (e avisa que parece fixo).
    expect(parseWhatsapp('11 3456-7890')).toBeUndefined();
  });

  test('formata celular e fixo', () => {
    expect(formatWhatsapp('11987654321')).toBe('(11) 98765-4321');
    expect(formatWhatsapp('1134567890')).toBe('(11) 3456-7890');
  });
});

describe('whatsappLink', () => {
  test('abre a conversa com o 55 do país e a mensagem escrita', () => {
    expect(whatsappLink('11987654321', 'Oi! Tudo bem?')).toBe(
      'https://wa.me/5511987654321?text=Oi!%20Tudo%20bem%3F',
    );
  });
});

describe('cleanWhatsapp e formatTypedWhatsapp', () => {
  test('tira o 55 do país, o 0 e a operadora, e nada mais', () => {
    expect(cleanWhatsapp('+55 (11) 98765-4321')).toEqual({
      digits: '11987654321',
      removed: 'pais',
    });
    expect(cleanWhatsapp('011 98765-4321')).toEqual({ digits: '11987654321', removed: 'zero' });
    expect(cleanWhatsapp('0 21 11 98765-4321')).toEqual({
      digits: '11987654321',
      removed: 'operadora',
    });
    // 55 é DDD também (RS): com 11 números, fica.
    expect(cleanWhatsapp('55 99876-5432')).toEqual({ digits: '55998765432' });
    // Número a mais não é cortado: ela vê e corrige.
    expect(cleanWhatsapp('119876543210').digits).toBe('119876543210');
  });

  test('formata aos poucos, enquanto ela digita', () => {
    expect(formatTypedWhatsapp('')).toBe('');
    expect(formatTypedWhatsapp('1')).toBe('(1');
    expect(formatTypedWhatsapp('11')).toBe('(11');
    expect(formatTypedWhatsapp('119876')).toBe('(11) 9876');
    expect(formatTypedWhatsapp('11987654')).toBe('(11) 9876-54');
    expect(formatTypedWhatsapp('1134567890')).toBe('(11) 3456-7890');
    expect(formatTypedWhatsapp('11987654321')).toBe('(11) 98765-4321');
    // A mais: solto, sem cara de número certo.
    expect(formatTypedWhatsapp('119876543210')).toBe('119876543210');
  });
});

describe('whatsappHint', () => {
  test('exemplo e quanto falta', () => {
    expect(whatsappHint('')).toEqual({ tone: 'info', text: 'Exemplo: (11) 9XXXX-XXXX' });
    expect(whatsappHint('1198765').text).toBe('Exemplo: (11) 9XXXX-XXXX · Faltam 4 números');
    expect(whatsappHint('1198765432').text).toBe('Exemplo: (11) 9XXXX-XXXX · Falta 1 número');
  });

  test('enganos comuns', () => {
    expect(whatsappHint('987654321').text).toMatch(/Faltou o DDD/);
    expect(whatsappHint('1134567890').text).toMatch(/telefone fixo/);
    expect(whatsappHint('11887654321').text).toMatch(/começa com 9/);
    expect(whatsappHint('119', 'zero').text).toMatch(/Não precisa do 0/);
    expect(whatsappHint('119876543210').text).toMatch(/número a mais/);
    expect(whatsappHint('20987').text).toBe('O DDD 20 não existe. Confira os 2 primeiros números.');
  });

  test('completo', () => {
    expect(whatsappHint('11987654321')).toEqual({ tone: 'ok', text: 'Número completo' });
  });
});

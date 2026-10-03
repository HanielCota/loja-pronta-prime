import { describe, expect, test } from 'bun:test';
import {
  formatTypedWhatsapp,
  formatWhatsapp,
  parseWhatsapp,
  typedWhatsapp,
  whatsappHint,
  whatsappLink,
} from './whatsapp';

describe('parseWhatsapp e formatWhatsapp', () => {
  test('aceita qualquer formato com DDD e guarda só os dígitos', () => {
    expect(parseWhatsapp('(11) 98765-4321')).toBe('11987654321');
    expect(parseWhatsapp('+55 11 98765 4321')).toBe('11987654321');
    expect(parseWhatsapp('5511987654321')).toBe('11987654321');
    expect(parseWhatsapp('11 3456-7890')).toBe('1134567890');
  });

  test('recusa número curto, longo ou com DDD começando em 0', () => {
    expect(parseWhatsapp('98765-4321')).toBeUndefined();
    expect(parseWhatsapp('119876543210')).toBeUndefined();
    expect(parseWhatsapp('01198765432')).toBeUndefined();
    expect(parseWhatsapp('')).toBeUndefined();
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

describe('typedWhatsapp e formatTypedWhatsapp', () => {
  test('tira o 55 do país (só com mais de 11 números) e os zeros da frente', () => {
    expect(typedWhatsapp('+55 (11) 98765-4321')).toEqual({
      digits: '11987654321',
      removed: 'pais',
    });
    expect(typedWhatsapp('011 98765-4321')).toEqual({ digits: '11987654321', removed: 'zero' });
    // 55 é DDD também (RS): com 11 números, fica.
    expect(typedWhatsapp('55 99876-5432')).toEqual({ digits: '55998765432' });
    expect(typedWhatsapp('119876543219999').digits).toBe('11987654321');
  });

  test('formata aos poucos, enquanto ela digita', () => {
    expect(formatTypedWhatsapp('')).toBe('');
    expect(formatTypedWhatsapp('1')).toBe('(1');
    expect(formatTypedWhatsapp('11')).toBe('(11');
    expect(formatTypedWhatsapp('119876')).toBe('(11) 9876');
    expect(formatTypedWhatsapp('11987654')).toBe('(11) 9876-54');
    expect(formatTypedWhatsapp('1134567890')).toBe('(11) 3456-7890');
    expect(formatTypedWhatsapp('11987654321')).toBe('(11) 98765-4321');
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
  });

  test('completo', () => {
    expect(whatsappHint('11987654321')).toEqual({ tone: 'ok', text: 'Número completo' });
  });
});

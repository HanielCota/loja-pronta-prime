import { describe, expect, test } from 'bun:test';
import { chooserHeadline } from './chooser';

describe('chooserHeadline', () => {
  test('loja esperando por ela: destaque e texto pra Loja Pronta', () => {
    expect(chooserHeadline({ store: { waitsOnStudent: true }, lastArea: 'sll' })).toEqual({
      primary: 'loja-pronta',
      description: 'Sua loja está esperando por você.',
    });
  });

  test('fase ainda fechada: sem destaque, avisa que chega um aviso', () => {
    const headline = chooserHeadline({ store: { waitsOnStudent: false }, lastArea: 'loja-pronta' });
    expect(headline.primary).toBeUndefined();
    expect(headline.description).toMatch(/aviso no WhatsApp/);
  });

  test('sem loja: continua de onde parou, ou escolhe por onde começar', () => {
    expect(chooserHeadline({ lastArea: 'sll' }).description).toBe('Continue de onde parou.');
    expect(chooserHeadline({}).description).toBe('Escolha por onde começar.');
  });
});

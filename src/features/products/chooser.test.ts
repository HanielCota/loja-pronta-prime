import { describe, expect, test } from 'bun:test';
import { chooserHeadline } from './chooser';

describe('chooserHeadline', () => {
  test('loja esperando por ela: destaque e texto pra Loja Pronta', () => {
    expect(chooserHeadline({ store: { waitsOnStudent: true }, lastArea: 'sll' })).toEqual({
      primary: 'loja-pronta',
      description: 'Sua loja está esperando por você.',
    });
  });

  test('fase ainda fechada: permite estudar sem prometer avisos automáticos', () => {
    const headline = chooserHeadline({
      store: { waitsOnStudent: false },
      lastArea: 'loja-pronta',
      hasSllAccess: true,
    });
    expect(headline.primary).toBeUndefined();
    expect(headline.description).toContain('em preparação');
    expect(headline.description).toContain('aulas do SLL');
    expect(headline.description).not.toContain('WhatsApp');
  });

  test('sem SLL, uma fase fechada não recomenda um produto que a conta não tem', () => {
    const headline = chooserHeadline({ store: { waitsOnStudent: false } });
    expect(headline.description).not.toContain('SLL');
    expect(headline.description).toContain('rever');
  });

  test('sem loja: continua de onde parou, ou escolhe por onde começar', () => {
    expect(chooserHeadline({ lastArea: 'sll' }).description).toBe('Continue de onde parou.');
    expect(chooserHeadline({}).description).toBe('Escolha por onde começar.');
  });
});

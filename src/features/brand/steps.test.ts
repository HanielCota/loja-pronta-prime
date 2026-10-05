import { describe, expect, test } from 'bun:test';
import { brandStepHeader, canOpenBrandStep, resumeBrandStep } from './steps';

const EMPTY = { name: null, logoImage: null, description: null };

describe('passos da marca', () => {
  test('topo: "Passo N de 3" e a barra', () => {
    expect(brandStepHeader('nome')).toEqual({
      label: 'Passo 1 de 3',
      filled: 1,
      total: 3,
      names: ['Nome', 'Logo', 'Texto'],
    });
    expect(brandStepHeader('logo')).toMatchObject({ label: 'Passo 2 de 3', filled: 2 });
    expect(brandStepHeader('revisao')).toMatchObject({
      label: 'Revisão da marca',
      filled: 3,
    });
    // Na revisão, sem os nomes: a barra está toda cheia e o rótulo já diz onde ela está.
    expect(brandStepHeader('revisao')).not.toHaveProperty('names');
  });

  test('continua de onde parou e não pula passo', () => {
    expect(resumeBrandStep(EMPTY)).toBe('nome');
    // Com o nome, o estúdio do logo; com o logo, o texto; com tudo, a revisão.
    expect(resumeBrandStep({ ...EMPTY, name: 'Bella' })).toBe('logo');
    expect(resumeBrandStep({ ...EMPTY, name: 'Bella', logoImage: 'logos/a/b.png' })).toBe(
      'descricao',
    );
    expect(
      resumeBrandStep({ name: 'Bella', logoImage: 'logos/a/b.png', description: 'Texto' }),
    ).toBe('revisao');
    expect(canOpenBrandStep('logo', EMPTY)).toBe(false);
    expect(canOpenBrandStep('logo', { ...EMPTY, name: 'Bella' })).toBe(true);
    expect(canOpenBrandStep('descricao', { ...EMPTY, name: 'Bella' })).toBe(false);
    expect(canOpenBrandStep('nome', EMPTY)).toBe(true);
  });
});

import { describe, expect, test } from 'bun:test';
import { brandStepHeader, canOpenBrandStep, resumeBrandStep } from './steps';

const EMPTY = { name: null, logo: null, description: null };

describe('passos da marca', () => {
  test('topo: "Passo N de 3" e a barra', () => {
    expect(brandStepHeader('nome')).toEqual({
      label: 'Passo 1 de 3',
      filled: 1,
      total: 3,
      names: ['Nome', 'Logo', 'Texto'],
    });
    expect(brandStepHeader('ajustar')).toMatchObject({ label: 'Passo 2 de 3', filled: 2 });
    expect(brandStepHeader('revisao')).toMatchObject({
      label: 'Revisão da marca',
      filled: 3,
    });
    // Na revisão, sem os nomes: a barra está toda cheia e o rótulo já diz onde ela está.
    expect(brandStepHeader('revisao')).not.toHaveProperty('names');
  });

  test('continua de onde parou e não pula passo', () => {
    expect(resumeBrandStep(EMPTY)).toBe('nome');
    // Com o nome, direto pro logo (o primeiro modelo entra junto com o nome).
    expect(resumeBrandStep({ ...EMPTY, name: 'Bella' })).toBe('ajustar');
    expect(canOpenBrandStep('ajustar', EMPTY)).toBe(false);
    expect(canOpenBrandStep('ajustar', { ...EMPTY, name: 'Bella' })).toBe(true);
    expect(canOpenBrandStep('nome', EMPTY)).toBe(true);
  });
});

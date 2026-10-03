import { describe, expect, test } from 'bun:test';
import { brandStepHeader, canOpenBrandStep, resumeBrandStep } from './steps';

const EMPTY = { name: null, logo: null, description: null };

describe('passos da marca', () => {
  test('topo: "Passo N de 4" e o aviso de escolhas salvas depois do primeiro', () => {
    expect(brandStepHeader('nome', false)).toEqual({
      label: 'Passo 1 de 4',
      filled: 1,
      total: 4,
      saved: false,
      names: ['Nome', 'Modelo', 'Logo', 'Texto'],
    });
    expect(brandStepHeader('ajustar', true)).toMatchObject({ label: 'Passo 3 de 4', saved: true });
    expect(brandStepHeader('revisao', true)).toMatchObject({
      label: 'Revisão da marca',
      filled: 4,
    });
    // Na revisão, sem os nomes: a barra está toda cheia e o rótulo já diz onde ela está.
    expect(brandStepHeader('revisao', true)).not.toHaveProperty('names');
    // Nome já escolhido (voltou da revisão pra mudar): o passo 1 também avisa.
    expect(brandStepHeader('nome', true).saved).toBe(true);
  });

  test('continua de onde parou e não pula passo', () => {
    expect(resumeBrandStep(EMPTY)).toBe('nome');
    expect(resumeBrandStep({ ...EMPTY, name: 'Bella' })).toBe('modelo');
    expect(canOpenBrandStep('modelo', EMPTY)).toBe(false);
    expect(canOpenBrandStep('nome', EMPTY)).toBe(true);
  });
});

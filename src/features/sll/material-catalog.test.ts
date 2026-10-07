import { describe, expect, it } from 'bun:test';
import { getSllExpectedMaterial } from './material-catalog';

describe('catálogo de materiais do SLL', () => {
  it('identifica a planilha da aula 40 sem tratá-la como PDF', () => {
    expect(getSllExpectedMaterial(40)).toMatchObject({
      fileName: 'dashboard-pessoal-msl.xlsx',
      formatLabel: 'XLSX',
    });
  });

  it('não cria um material para numeração que não está no inventário', () => {
    expect(getSllExpectedMaterial(41)).toBeNull();
  });
});

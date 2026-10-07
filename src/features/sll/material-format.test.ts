import { describe, expect, it } from 'bun:test';
import { describeSllMaterial, libraryMaterialLabel } from './material-format';

describe('formato do material do SLL', () => {
  it('indica o material disponível, prioriza arquivos e ignora dados incompletos', () => {
    expect(libraryMaterialLabel(undefined)).toBeNull();
    expect(
      libraryMaterialLabel([
        { kind: 'file', data: null },
        { kind: 'link', data: 'texto' },
      ]),
    ).toBeNull();
    expect(libraryMaterialLabel([{ kind: 'image', data: { alt: 'Imagem' } }])).toBe(
      'Imagem da aula',
    );
    expect(libraryMaterialLabel([{ kind: 'link', data: { label: 'Link' } }])).toBe('Link da aula');
    expect(
      libraryMaterialLabel([
        { kind: 'link', data: { label: 'Link' } },
        { kind: 'file', data: { fileName: 'material.pdf' } },
      ]),
    ).toBe('Material da aula');
  });
  it('identifica PDF e mantém sua etiqueta semântica', () => {
    expect(describeSllMaterial('scripts.pdf', 'application/pdf')).toEqual({
      kind: 'pdf',
      label: 'PDF',
    });
  });

  it('identifica planilha pelo tipo confirmado', () => {
    expect(
      describeSllMaterial(
        'dashboard.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toEqual({ kind: 'spreadsheet', label: 'XLSX' });
  });

  it('usa um rótulo verdadeiro para formatos conhecidos e reserva Arquivo para o restante', () => {
    expect(describeSllMaterial('roteiro.zip')).toEqual({ kind: 'archive', label: 'ZIP' });
    expect(describeSllMaterial('material.bin', 'application/octet-stream')).toEqual({
      kind: 'file',
      label: 'Arquivo',
    });
  });
});

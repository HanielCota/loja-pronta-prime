import { describe, expect, it } from 'bun:test';
import { describeSllMaterial } from './material-format';

describe('formato do material do SLL', () => {
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

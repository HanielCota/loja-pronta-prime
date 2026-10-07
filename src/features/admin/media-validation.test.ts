import { describe, expect, it } from 'bun:test';
import { validateDownloadFile } from './media-validation';

describe('materiais de aula', () => {
  it('confere PDF e arquivos compactados pelo conteúdo', () => {
    expect(
      validateDownloadFile('guia.pdf', new TextEncoder().encode('%PDF-1.7'))?.contentType,
    ).toBe('application/pdf');
    expect(
      validateDownloadFile('roteiro.zip', new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
    ).toMatchObject({ extension: '.zip' });
    expect(validateDownloadFile('falso.pdf', new TextEncoder().encode('nao e pdf'))).toBeNull();
  });

  it('aceita texto UTF-8 e recusa conteúdo binário e formatos executáveis', () => {
    expect(validateDownloadFile('passos.txt', new TextEncoder().encode('Aula 1'))).toMatchObject({
      extension: '.txt',
    });
    expect(validateDownloadFile('foto.txt', new Uint8Array([0x00, 0x01]))).toBeNull();
    expect(validateDownloadFile('programa.exe', new Uint8Array([0x4d, 0x5a]))).toBeNull();
    expect(
      validateDownloadFile(
        'erro.txt',
        new TextEncoder().encode('<!doctype html><title>Erro</title>'),
      ),
    ).toBeNull();
  });
});

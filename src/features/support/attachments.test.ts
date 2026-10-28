import { describe, expect, test } from 'bun:test';
import {
  attachmentStorageKey,
  detectAttachmentType,
  isHeic,
  refusedFilesNotice,
  safeFileName,
  selectAttachments,
} from './attachments';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const pdf = new TextEncoder().encode('%PDF-1.7 ....');
const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
const heic = new Uint8Array([0, 0, 0, 0x18, ...new TextEncoder().encode('ftypheic'), 0, 0]);
const exe = new TextEncoder().encode('MZ\x90\0\x03\0\0\0');

describe('tipo pelos bytes', () => {
  test('aceita PNG, JPEG, WEBP e PDF', () => {
    expect(detectAttachmentType(png)).toBe('image/png');
    expect(detectAttachmentType(jpeg)).toBe('image/jpeg');
    expect(detectAttachmentType(webp)).toBe('image/webp');
    expect(detectAttachmentType(pdf)).toBe('application/pdf');
  });

  test('recusa o que não é, mesmo com extensão de imagem', () => {
    expect(detectAttachmentType(exe)).toBeNull();
  });

  test('reconhece foto do iPhone', () => {
    expect(isHeic(heic, 'foto.jpg')).toBe(true);
    expect(isHeic(png, 'IMG_1234.HEIC')).toBe(true);
    expect(isHeic(png, 'print.png')).toBe(false);
  });
});

describe('nome seguro', () => {
  test('tira acento, espaço e caminho, e usa a extensão do tipo real', () => {
    expect(safeFileName('Captura de tela às 10.png.exe', 'image/png')).toBe('Captura-de-tela-as-10-png.png');
    expect(safeFileName('../../etc/passwd', 'application/pdf')).toBe('passwd.pdf');
    expect(safeFileName('???', 'image/jpeg')).toBe('anexo.jpg');
  });
});

function file(name: string, head: Uint8Array, size = 1000, key = name) {
  return { name, size, key, head };
}

describe('escolha dos anexos', () => {
  test('cada recusa tem o seu motivo', () => {
    const { accepted, refused } = selectAttachments(
      [{ key: 'a.png' }],
      [
        file('a.png', png),
        file('b.heic', heic),
        file('c.exe', exe),
        file('d.png', png, 6 * 1024 * 1024),
        file('e.pdf', pdf),
        file('f.png', png),
        file('g.png', png),
      ],
    );
    expect(accepted.map((item) => item.name)).toEqual(['e.pdf', 'f.png']);
    expect(refused).toEqual([
      { name: 'a.png', reason: 'duplicate' },
      { name: 'b.heic', reason: 'heic' },
      { name: 'c.exe', reason: 'type' },
      { name: 'd.png', reason: 'size' },
      { name: 'g.png', reason: 'too-many' },
    ]);
  });
});

describe('arquivos que ficaram de fora', () => {
  test('sem recusa, sem aviso', () => {
    expect(refusedFilesNotice([])).toBeNull();
  });

  test('cada arquivo recusado ganha a sua frase', () => {
    expect(
      refusedFilesNotice([
        { name: 'virus.png', reason: 'type' },
        { name: 'foto.png', reason: 'broken' },
      ]),
    ).toBe('virus.png não pode ser enviado. Envie PNG, JPG, WEBP ou PDF. foto.png é uma imagem grande demais ou estragada.');
  });
});

describe('chave no bucket', () => {
  test('não leva o nome que a aluna deu ao arquivo', () => {
    const key = attachmentStorageKey('chamado-1', 'abc', 'image/png');
    expect(key).toBe('support/chamado-1/abc.png');
  });
});

import { describe, expect, it } from 'bun:test';
import { lessonPublicationIssue, type PublicationBlock } from './publication-rules';

const goodBlocks: PublicationBlock[] = [
  { kind: 'text', data: { text: 'Leia este material.' } },
  { kind: 'link', data: { label: 'Abrir página', url: 'https://example.com' } },
  {
    kind: 'video',
    data: { provider: 'pandavideo', videoId: '44408d11-f282-4a43-9949-8b3c44b94ee4' },
  },
  {
    kind: 'file',
    data: {
      fileName: 'guia.pdf',
      storageKey: 'sll/learning-content/a/guia.pdf',
      contentType: 'application/pdf',
      size: 12,
    },
  },
  {
    kind: 'image',
    data: {
      alt: 'Exemplo',
      storageKey: 'sll/learning-content/a/imagem.webp',
      contentType: 'image/webp',
      size: 12,
    },
  },
];

describe('publicação de aulas', () => {
  it('permite publicar descrição ou materiais válidos', () => {
    expect(lessonPublicationIssue('Aula', 'Introdução', [])).toBeNull();
    expect(lessonPublicationIssue('Aula', null, goodBlocks)).toBeNull();
  });

  it('pede título e algum conteúdo', () => {
    expect(lessonPublicationIssue(' ', 'Texto', [])).toContain('título');
    expect(lessonPublicationIssue('Aula', null, [])).toContain('descrição');
  });

  it.each([
    { kind: 'text', data: { text: ' ' } },
    { kind: 'video', data: { provider: 'outro', videoId: 'x' } },
    { kind: 'video', data: { provider: 'pandavideo', videoId: '' } },
    { kind: 'link', data: { label: 'Acessar', url: 'javascript:alert(1)' } },
    { kind: 'file', data: { fileName: 'guia.pdf' } },
    { kind: 'image', data: { alt: 'Exemplo' } },
  ] satisfies PublicationBlock[])('recusa dados incompletos no bloco $kind', (block) => {
    expect(lessonPublicationIssue('Aula', null, [block])).not.toBeNull();
  });
});

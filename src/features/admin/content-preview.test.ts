import { describe, expect, test } from 'bun:test';
import { contentPreviewData } from './content-preview';

describe('contentPreviewData', () => {
  test('mantém só os campos que aparecem na conferência da aula', () => {
    expect(
      contentPreviewData('file', {
        storageKey: 'private/aula.pdf',
        fileName: 'guia.pdf',
        contentType: 'application/pdf',
        size: 240,
      }),
    ).toEqual({ fileName: 'guia.pdf', contentType: 'application/pdf' });
    expect(contentPreviewData('video', { provider: 'pandavideo', videoId: 'private-id' })).toEqual({
      provider: 'pandavideo',
      videoId: 'private-id',
    });
  });

  test('só cria link web http ou https sem credenciais embutidas', () => {
    expect(
      contentPreviewData('link', { url: 'https://example.com/aula', label: 'Ver material' }),
    ).toEqual({
      url: 'https://example.com/aula',
      label: 'Ver material',
    });
    expect(contentPreviewData('link', { url: 'javascript:alert(1)', label: 'Material' })).toEqual({
      label: 'Material',
    });
    expect(contentPreviewData('link', { url: 'https://aluna:senha@example.com' })).toEqual({});
  });
});

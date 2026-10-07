import { describe, expect, it } from 'bun:test';
import { pandaVideoEmbedUrl } from './panda-video';

describe('embed do Panda Video', () => {
  const videoId = '44408d11-f282-4a43-9949-8b3c44b94ee4';

  it('monta o player somente com host Panda HTTPS configurado', () => {
    expect(pandaVideoEmbedUrl(videoId, 'https://player-vz-abc123.tv.pandavideo.com.br')).toBe(
      `https://player-vz-abc123.tv.pandavideo.com.br/embed/?v=${videoId}`,
    );
  });

  it.each([
    undefined,
    '',
    'http://player-vz-abc123.tv.pandavideo.com.br',
    'https://example.com',
    'https://player-vz-abc123.tv.pandavideo.com.br.evil.example',
  ])('não cria embed para configuração ausente ou insegura: %s', (host) => {
    expect(pandaVideoEmbedUrl(videoId, host)).toBeNull();
  });
});

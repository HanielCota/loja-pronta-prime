import { describe, expect, it } from 'bun:test';
import catalog from '../../../data/sll/panda-videos.json';
import { pandaVideoEmbedUrl, pandaVideoId, pandaVideoImportDecision } from './panda-video';

const videoId = '44408d11-f282-4a43-9949-8b3c44b94ee4';

describe('vídeos Panda do SLL', () => {
  it('extrai o ID do link da conta e rejeita outros endereços ou credenciais no link', () => {
    const url = `https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=${videoId}`;
    expect(pandaVideoId(` ${url}&autoplay=true `)).toBe(videoId);
    expect(pandaVideoId(` ${videoId} `)).toBe(videoId);
    expect(pandaVideoId(url.replace('https://', 'http://'))).toBeNull();
    expect(pandaVideoId(url.replace('https://', 'https://user:pass@'))).toBeNull();
    expect(pandaVideoId(url.replace('dbb97dad-52b', 'unknown'))).toBeNull();
    expect(pandaVideoId(url.replace('/embed/', '/video/'))).toBeNull();
    expect(pandaVideoId('')).toBeNull();
  });
  it('usa o endereço conferido de todas as aulas, com início automático desligado', () => {
    const lessons = catalog.sections.flatMap((section) =>
      section.groups.flatMap((group) => group.lessons),
    );
    expect(lessons).toHaveLength(71);
    expect(new Set(lessons.map((lesson) => lesson.videoId)).size).toBe(70);
    for (const lesson of lessons) {
      const embed = pandaVideoEmbedUrl({ provider: 'pandavideo', videoId: lesson.videoId });
      expect(embed).toBe(`${lesson.embedUrl}&autoplay=false`);
    }
  });

  it('não cria player para espaço vazio, outro provedor ou ID inválido', () => {
    for (const data of [
      {},
      { provider: 'pandavideo', videoId: '' },
      { provider: 'unknown', videoId },
      { provider: 'pandavideo', videoId: 'https://example.com/video' },
      { provider: 'pandavideo', videoId: `${videoId}&autoplay=true` },
    ])
      expect(pandaVideoEmbedUrl(data)).toBeNull();
  });

  it('insere vídeos ausentes, preenche espaços e reconhece a importação repetida', () => {
    expect(pandaVideoImportDecision([], videoId)).toBe('insert');
    expect(
      pandaVideoImportDecision([{ data: { provider: 'pandavideo', videoId: '' } }], videoId),
    ).toBe('fill');
    expect(pandaVideoImportDecision([{ data: { provider: 'pandavideo', videoId } }], videoId)).toBe(
      'ready',
    );
  });

  it('preserva vídeo diferente, outro provedor e aulas com vários vídeos', () => {
    expect(
      pandaVideoImportDecision(
        [{ data: { provider: 'pandavideo', videoId: '9d49ad09-6743-43db-9672-d9a90c68575d' } }],
        videoId,
      ),
    ).toBe('conflict');
    expect(
      pandaVideoImportDecision([{ data: { provider: 'unknown', videoId: '' } }], videoId),
    ).toBe('conflict');
    expect(
      pandaVideoImportDecision(
        [
          { data: { provider: 'pandavideo', videoId: '' } },
          { data: { provider: 'pandavideo', videoId: '' } },
        ],
        videoId,
      ),
    ).toBe('conflict');
    expect(pandaVideoImportDecision([], 'inválido')).toBe('conflict');
  });
});

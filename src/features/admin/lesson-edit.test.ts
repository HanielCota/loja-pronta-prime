import { describe, expect, it } from 'bun:test';
import { parseLessonEdit } from './lesson-edit';

const valid = {
  lessonId: 'ad8ef196-1a1a-4b73-a3d2-b95a70424451',
  title: 'Comece por aqui',
  description: 'Uma introdução simples.',
  blocks: [
    {
      id: '1928c79d-8bd5-4241-8ddf-0c06803dd91c',
      kind: 'link',
      label: 'Material',
      url: 'https://example.com/material',
    },
    { id: 'f215403d-aec0-4cbf-9063-5b3a519ef3d7', kind: 'text', text: 'Leia este texto.' },
  ],
};

describe('edição de aula', () => {
  it('aceita textos e links web e transforma descrição vazia em nula', () => {
    const result = parseLessonEdit({ ...valid, description: '  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it('aceita blocos novos de texto e link antes de salvar', () => {
    const result = parseLessonEdit({
      ...valid,
      blocks: [
        { kind: 'text', text: 'Novo conteúdo' },
        { kind: 'link', label: 'Abrir material', url: 'https://example.com/aula' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('aceita vídeo Panda com identificador válido e recusa outro provedor', () => {
    const video = {
      kind: 'video',
      provider: 'pandavideo',
      videoId: '44408d11-f282-4a43-9949-8b3c44b94ee4',
    };
    expect(parseLessonEdit({ ...valid, blocks: [video] }).success).toBe(true);
    expect(parseLessonEdit({ ...valid, blocks: [{ ...video, provider: 'unknown' }] }).success).toBe(
      false,
    );
  });

  it('mantém um espaço de vídeo vazio enquanto o material não existe', () => {
    const result = parseLessonEdit({
      ...valid,
      blocks: [{ kind: 'video', provider: 'pandavideo', videoId: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('aceita o link do player da conta e salva somente o ID do vídeo', () => {
    const videoId = '44408d11-f282-4a43-9949-8b3c44b94ee4';
    const video = {
      kind: 'video',
      provider: 'pandavideo',
      videoId: `https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=${videoId}`,
    };
    const result = parseLessonEdit({ ...valid, blocks: [video] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.blocks[0]).toMatchObject({ videoId });
    expect(
      parseLessonEdit({
        ...valid,
        blocks: [{ ...video, videoId: video.videoId.replace('dbb97dad-52b', 'unknown') }],
      }).success,
    ).toBe(false);
  });

  it('aceita anotações em links e vídeos e um arquivo ligado a um deles', () => {
    const linkId = '1928c79d-8bd5-4241-8ddf-0c06803dd91c';
    const result = parseLessonEdit({
      ...valid,
      blocks: [
        { ...valid.blocks[0], note: 'Leia antes de abrir.' },
        { kind: 'video', provider: 'pandavideo', videoId: '', note: 'Veja esta explicação.' },
        {
          id: '0b21e70b-3dc5-4877-89c6-132f56b234cd',
          kind: 'file',
          fileName: 'Guia.pdf',
          attachedTo: linkId,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blocks[0]).toMatchObject({ note: 'Leia antes de abrir.' });
      expect(result.data.blocks[2]).toMatchObject({ attachedTo: linkId });
    }
  });

  it.each(['javascript:alert(1)', 'data:text/html,oi', 'https://user:pass@example.com'])(
    'recusa link inseguro: %s',
    (url) => {
      const result = parseLessonEdit({ ...valid, blocks: [{ ...valid.blocks[0], url }] });
      expect(result.success).toBe(false);
    },
  );

  it('não aceita aula sem título nem campos inválidos', () => {
    expect(parseLessonEdit({ ...valid, title: ' ' }).success).toBe(false);
  });
});

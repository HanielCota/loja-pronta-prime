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

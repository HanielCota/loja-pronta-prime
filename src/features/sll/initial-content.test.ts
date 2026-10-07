import { describe, expect, test } from 'bun:test';
import pandaCatalog from '../../../data/sll/panda-videos.json';
import { initialSllContent, validateInitialSllContent } from './initial-content';

describe('inventário inicial do SLL', () => {
  test('cada um dos 71 players fica na aula correspondente, com as três etapas completas', () => {
    const content = initialSllContent();
    const actual = new Map(
      content.tracks.flatMap((track) =>
        track.stages.flatMap((stage) =>
          stage.modules.flatMap((module) =>
            module.lessons.map(
              (lesson) =>
                [
                  `${track.slug}/${stage.slug}/${module.slug}/${lesson.slug}`,
                  lesson.videoId,
                ] as const,
            ),
          ),
        ),
      ),
    );
    for (const section of pandaCatalog.sections)
      for (const group of section.groups)
        for (const lesson of group.lessons)
          expect(
            actual.get(
              `${group.project.trackSlug}/${group.project.stageSlug}/${group.project.moduleSlug}/${lesson.projectLessonSlug}`,
            ),
          ).toBe(lesson.videoId);
    const stages = content.tracks.find((track) => track.kind === 'method')!.stages;
    expect(stages.map((stage) => stage.slug)).toEqual(['etapa-1', 'etapa-2', 'etapa-3']);
    const actions = stages[1]!.modules.flatMap((module) => module.lessons);
    expect(actions.filter((lesson) => lesson.countsTowardProgress)).toHaveLength(6);
    expect(actions.filter((lesson) => lesson.relatedLessonSlug)).toHaveLength(12);
    expect(actual.size).toBe(84);
  });

  test('recursos sem destino permanecem sem botão e não importa imagens ou arquivos locais', () => {
    const content = initialSllContent();
    expect(content.resources.filter((item) => !item.destination).map((item) => item.slug)).toEqual([
      'calculadora-preco-shopee',
      'envio-velox',
    ]);
    expect(JSON.stringify(content)).not.toContain('storageKey');
    expect(content.tracks.filter((track) => track.featured).map((track) => track.slug)).toEqual([
      'shopee-ads-completo',
    ]);
  });

  test('recusa inventário incompleto, vídeo inválido ou referência quebrada antes de publicar', () => {
    const incomplete = initialSllContent();
    incomplete.tracks[0]!.stages[0]!.modules[0]!.lessons.pop();
    expect(() => validateInitialSllContent(incomplete)).toThrow();
    const invalidVideo = initialSllContent();
    invalidVideo.tracks[0]!.stages[0]!.modules[0]!.lessons[0]!.videoId = 'video-invalido';
    expect(() => validateInitialSllContent(invalidVideo)).toThrow();
    const invalidReference = initialSllContent();
    invalidReference.tracks[1]!.stages[1]!.modules[1]!.lessons[0]!.relatedLessonSlug = 'ausente';
    expect(() => validateInitialSllContent(invalidReference)).toThrow();
  });
});

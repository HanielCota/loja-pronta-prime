import { asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { contentPreviewData } from '../content-preview';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

/** Carrega a hierarquia na ordem cadastrada para a primeira lista do painel administrativo. */
export async function getAdminLearningContent() {
  const tracks = await db.query.learningTracks.findMany({
    columns: { id: true, kind: true, title: true, description: true, status: true },
    where: isNull(learningTracks.archivedAt),
    orderBy: [asc(learningTracks.position), asc(learningTracks.id)],
    with: {
      stages: {
        columns: { id: true, title: true, description: true, status: true },
        where: isNull(learningStages.archivedAt),
        orderBy: [asc(learningStages.position), asc(learningStages.id)],
        with: {
          modules: {
            columns: { id: true, title: true, description: true, status: true },
            where: isNull(learningModules.archivedAt),
            orderBy: [asc(learningModules.position), asc(learningModules.id)],
            with: {
              lessons: {
                columns: {
                  id: true,
                  title: true,
                  description: true,
                  slug: true,
                  status: true,
                  durationMinutes: true,
                  countsTowardProgress: true,
                },
                orderBy: [asc(learningLessons.position), asc(learningLessons.id)],
                where: isNull(learningLessons.archivedAt),
                with: {
                  blocks: {
                    columns: { id: true, kind: true, data: true },
                    orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return tracks.map((track) => ({
    ...track,
    stages: track.stages.map((stage) => ({
      ...stage,
      modules: stage.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          blocks: lesson.blocks.map((block) => ({
            id: block.id,
            kind: block.kind,
            data: contentPreviewData(block.kind, block.data),
          })),
        })),
      })),
    })),
  }));
}

/** Carrega uma aula e seu caminho para a prévia protegida do painel. */
export async function getAdminLessonPreview(id: string) {
  const lesson = await db.query.learningLessons.findFirst({
    columns: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      status: true,
      archivedAt: true,
    },
    where: eq(learningLessons.id, id),
    with: {
      module: {
        columns: { id: true, title: true, archivedAt: true },
        with: {
          stage: {
            columns: { title: true, archivedAt: true },
            with: { track: { columns: { title: true, archivedAt: true } } },
          },
          lessons: {
            columns: { id: true, title: true, position: true, status: true, archivedAt: true },
            where: isNull(learningLessons.archivedAt),
            orderBy: [asc(learningLessons.position), asc(learningLessons.id)],
          },
        },
      },
      blocks: {
        columns: { id: true, kind: true, data: true },
        orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
      },
    },
  });
  if (
    !lesson ||
    lesson.archivedAt ||
    lesson.module.archivedAt ||
    lesson.module.stage.archivedAt ||
    lesson.module.stage.track.archivedAt
  )
    return null;
  return {
    ...lesson,
    module: {
      ...lesson.module,
      lessons: lesson.module.lessons
        .filter((item) => item.status === 'published' || item.id === lesson.id)
        .map((item, index) => ({
          id: item.id,
          title: item.title,
          position: item.position,
          status: item.status,
          current: item.id === lesson.id,
          number: index + 1,
        })),
    },
    blocks: lesson.blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      data: contentPreviewData(block.kind, block.data),
    })),
  };
}

/** Lista conteúdos arquivados sem remover seus vínculos ou materiais. */
export async function getArchivedLearningContent() {
  const [tracks, stages, modules, lessons] = await Promise.all([
    db.query.learningTracks.findMany({
      columns: { id: true, title: true, archivedAt: true },
      where: isNotNull(learningTracks.archivedAt),
      orderBy: [asc(learningTracks.title)],
    }),
    db.query.learningStages.findMany({
      columns: { id: true, title: true, trackId: true, archivedAt: true },
      where: isNotNull(learningStages.archivedAt),
      orderBy: [asc(learningStages.title)],
    }),
    db.query.learningModules.findMany({
      columns: { id: true, title: true, stageId: true, archivedAt: true },
      where: isNotNull(learningModules.archivedAt),
      orderBy: [asc(learningModules.title)],
    }),
    db.query.learningLessons.findMany({
      columns: { id: true, title: true, moduleId: true, archivedAt: true },
      where: isNotNull(learningLessons.archivedAt),
      orderBy: [asc(learningLessons.title)],
    }),
  ]);

  return [
    ...tracks.map((item) => ({
      id: item.id,
      title: item.title,
      kind: 'track' as const,
      parentId: null,
      archivedAt: item.archivedAt!,
    })),
    ...stages.map((item) => ({
      id: item.id,
      title: item.title,
      kind: 'stage' as const,
      parentId: item.trackId,
      archivedAt: item.archivedAt!,
    })),
    ...modules.map((item) => ({
      id: item.id,
      title: item.title,
      kind: 'module' as const,
      parentId: item.stageId,
      archivedAt: item.archivedAt!,
    })),
    ...lessons.map((item) => ({
      id: item.id,
      title: item.title,
      kind: 'lesson' as const,
      parentId: item.moduleId,
      archivedAt: item.archivedAt!,
    })),
  ].toSorted((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

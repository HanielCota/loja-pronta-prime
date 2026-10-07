import { asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { contentPreviewData } from '../content-preview';
import {
  learningContentBlocks,
  learningLessons,
  learningNodeDrafts,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

/** Carrega a hierarquia na ordem cadastrada para a primeira lista do painel administrativo. */
export async function getAdminLearningContent() {
  const [tracks, drafts, history] = await Promise.all([
    db.query.learningTracks.findMany({
      columns: {
        id: true,
        kind: true,
        title: true,
        description: true,
        status: true,
        coverStorageKey: true,
        coverAlt: true,
        featured: true,
      },
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
                    relatedLessonId: true,
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
    }),
    db.query.learningNodeDrafts.findMany(),
    db.query.learningNodeHistory.findMany(),
  ]);

  const byKey = new Map(drafts.map((draft) => [`${draft.kind}:${draft.nodeId}`, draft.data]));
  const historyKeys = new Set(history.map((item) => `${item.kind}:${item.nodeId}`));

  return tracks.map((track) => ({
    ...track,
    title: byKey.get(`track:${track.id}`)?.title ?? track.title,
    description:
      byKey.get(`track:${track.id}`)?.description === undefined
        ? track.description
        : byKey.get(`track:${track.id}`)!.description!,
    coverStorageKey:
      byKey.get(`track:${track.id}`)?.coverStorageKey === undefined
        ? track.coverStorageKey
        : byKey.get(`track:${track.id}`)!.coverStorageKey!,
    coverAlt:
      byKey.get(`track:${track.id}`)?.coverAlt === undefined
        ? track.coverAlt
        : byKey.get(`track:${track.id}`)!.coverAlt!,
    hasDraft: byKey.has(`track:${track.id}`),
    hasHistory: historyKeys.has(`track:${track.id}`),
    stages: track.stages.map((stage) => ({
      ...stage,
      title: byKey.get(`stage:${stage.id}`)?.title ?? stage.title,
      description:
        byKey.get(`stage:${stage.id}`)?.description === undefined
          ? stage.description
          : byKey.get(`stage:${stage.id}`)!.description!,
      hasDraft: byKey.has(`stage:${stage.id}`),
      hasHistory: historyKeys.has(`stage:${stage.id}`),
      modules: stage.modules.map((group) => ({
        ...group,
        title: byKey.get(`module:${group.id}`)?.title ?? group.title,
        description:
          byKey.get(`module:${group.id}`)?.description === undefined
            ? group.description
            : byKey.get(`module:${group.id}`)!.description!,
        hasDraft: byKey.has(`module:${group.id}`),
        hasHistory: historyKeys.has(`module:${group.id}`),
        lessons: group.lessons.map((lesson) => ({
          ...lesson,
          title: byKey.get(`lesson:${lesson.id}`)?.title ?? lesson.title,
          description:
            byKey.get(`lesson:${lesson.id}`)?.description === undefined
              ? lesson.description
              : byKey.get(`lesson:${lesson.id}`)!.description!,
          durationMinutes:
            byKey.get(`lesson:${lesson.id}`)?.durationMinutes === undefined
              ? lesson.durationMinutes
              : byKey.get(`lesson:${lesson.id}`)!.durationMinutes!,
          countsTowardProgress:
            byKey.get(`lesson:${lesson.id}`)?.countsTowardProgress ?? lesson.countsTowardProgress,
          relatedLessonId:
            byKey.get(`lesson:${lesson.id}`)?.relatedLessonId === undefined
              ? lesson.relatedLessonId
              : byKey.get(`lesson:${lesson.id}`)!.relatedLessonId!,
          hasDraft: byKey.has(`lesson:${lesson.id}`),
          hasHistory: historyKeys.has(`lesson:${lesson.id}`),
          blocks: (byKey.get(`lesson:${lesson.id}`)?.blocks ?? lesson.blocks).map((block) => ({
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
  const [lesson, siblingDrafts] = await Promise.all([
    db.query.learningLessons.findFirst({
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
    }),
    db.query.learningNodeDrafts.findMany({
      where: eq(learningNodeDrafts.kind, 'lesson'),
    }),
  ]);
  const draftsById = new Map(siblingDrafts.map((item) => [item.nodeId, item.data]));
  const draft = draftsById.get(id);
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
    title: draft?.title ?? lesson.title,
    description: draft?.description === undefined ? lesson.description : draft.description,
    durationMinutes:
      draft?.durationMinutes === undefined ? lesson.durationMinutes : draft.durationMinutes,
    hasDraft: Boolean(draft),
    module: {
      ...lesson.module,
      lessons: lesson.module.lessons.map((item, index) => ({
        id: item.id,
        title: draftsById.get(item.id)?.title ?? item.title,
        position: item.position,
        status: item.status,
        hasDraft: Boolean(draftsById.get(item.id)),
        current: item.id === lesson.id,
        number: index + 1,
      })),
    },
    blocks: (draft?.blocks ?? lesson.blocks).map((block) => ({
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
      columns: { id: true, title: true, kind: true, archivedAt: true },
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
      trackKind: item.kind,
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

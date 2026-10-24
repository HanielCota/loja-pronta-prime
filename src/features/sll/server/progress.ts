import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { getPublishedSllTrack } from './published-track';
import { requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import { learningLessonProgress, learningTrackProgress } from '@/server/db/schema';
import {
  isProgressId,
  resolveSequentialStageAccess,
  summarizeTrackProgress,
} from '../progress-rules';

/**
 * Todo o progresso da aluna numa leitura por tabela (no máximo uma linha por aula ou trilha).
 * A lista de cursos montava uma trilha por vez, com duas consultas cada, ao mesmo tempo no pool.
 */
const readStudentProgress = cache(async (userId: string) => {
  const [lessons, tracks] = await Promise.all([
    db.query.learningLessonProgress.findMany({
      columns: { lessonId: true, lastPositionSeconds: true, completedAt: true, lastViewedAt: true },
      where: eq(learningLessonProgress.userId, userId),
    }),
    db.query.learningTrackProgress.findMany({
      columns: { trackId: true, currentLessonId: true, lastAccessedAt: true },
      where: eq(learningTrackProgress.userId, userId),
    }),
  ]);
  return { lessons, tracks };
});

/** Carrega só aulas publicadas da trilha que a aluna pode acessar. */
// Só nesta renderização: deduplica consultas sem compartilhar progresso entre alunas.
export const getSllTrackProgress = cache(async (trackId: string) => {
  const { session } = await requireProduct('sll');
  if (!isProgressId(trackId)) return null;
  const [track, progress] = await Promise.all([
    getPublishedSllTrack(trackId),
    readStudentProgress(session.user.id),
  ]);
  if (!track) return null;

  const lessons = track.stages.flatMap((stage) =>
    stage.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        ...lesson,
        stageId: stage.id,
        stageTitle: stage.title,
        moduleId: module.id,
        moduleTitle: module.title,
      })),
    ),
  );
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const saved = progress.lessons.filter((row) => lessonIds.has(row.lessonId));
  const trackProgress = progress.tracks.find((row) => row.trackId === track.id);
  const summary = summarizeTrackProgress(lessons, saved, trackProgress?.currentLessonId ?? null);
  const progressByLesson = new Map(summary.lessons.map((item) => [item.lessonId, item]));
  const completedLessonIds = new Set(
    summary.lessons.filter((item) => item.completedAt !== null).map((item) => item.lessonId),
  );
  const stageAccess = new Map(
    resolveSequentialStageAccess(
      track.stages.map((stage) => ({
        id: stage.id,
        title: stage.title,
        lessons: stage.modules.flatMap((module) =>
          module.lessons
            .filter((lesson) => lesson.countsTowardProgress)
            .map((lesson) => ({ completed: completedLessonIds.has(lesson.id) })),
        ),
      })),
    ).map((stage) => {
      if (track.kind !== 'method') {
        return [stage.stageId, { ...stage, isUnlocked: true, lockMessage: null }] as const;
      }
      return [stage.stageId, stage] as const;
    }),
  );

  return {
    ...track,
    stages: track.stages.map((stage) => ({
      ...stage,
      access: stageAccess.get(stage.id),
      modules: stage.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          ...(progressByLesson.get(lesson.id) ?? {
            completedAt: null,
            lastPositionSeconds: 0,
            lastViewedAt: null,
          }),
        })),
      })),
    })),
    ...summary,
    currentLessonId: trackProgress?.currentLessonId ?? null,
    lastAccessedAt: trackProgress?.lastAccessedAt ?? null,
  };
});

import { and, eq, inArray } from 'drizzle-orm';
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

/** Carrega só aulas publicadas da trilha que a aluna pode acessar. */
// Só nesta renderização: deduplica consultas sem compartilhar progresso entre alunas.
export const getSllTrackProgress = cache(async (trackId: string) => {
  const { session } = await requireProduct('sll');
  if (!isProgressId(trackId)) return null;
  const track = await getPublishedSllTrack(trackId);
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
  const lessonIds = lessons.map((lesson) => lesson.id);
  const [saved, trackProgress] = await Promise.all([
    lessonIds.length
      ? db.query.learningLessonProgress.findMany({
          columns: {
            lessonId: true,
            lastPositionSeconds: true,
            completedAt: true,
            lastViewedAt: true,
          },
          where: and(
            eq(learningLessonProgress.userId, session.user.id),
            inArray(learningLessonProgress.lessonId, lessonIds),
          ),
        })
      : Promise.resolve([]),
    db.query.learningTrackProgress.findFirst({
      columns: { currentLessonId: true, lastAccessedAt: true },
      where: and(
        eq(learningTrackProgress.userId, session.user.id),
        eq(learningTrackProgress.trackId, track.id),
      ),
    }),
  ]);
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

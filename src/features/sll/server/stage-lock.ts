import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningLessonProgress,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import { resolveSequentialStageAccess } from '../progress-rules';

// Fica fora do arquivo 'use server': exportada de lá, viraria uma ação que qualquer
// navegador pode chamar. Aqui ela serve às ações de progresso e à rota de materiais.
/** Reconfere a etapa no servidor para que um link direto não contorne o bloqueio. */
export async function getStageLockMessage(userId: string, trackId: string, stageId: string) {
  const track = await db.query.learningTracks.findFirst({
    columns: { id: true, kind: true },
    where: and(
      eq(learningTracks.id, trackId),
      eq(learningTracks.status, 'published'),
      isNull(learningTracks.archivedAt),
    ),
    with: {
      stages: {
        columns: { id: true, title: true, position: true },
        where: and(eq(learningStages.status, 'published'), isNull(learningStages.archivedAt)),
        orderBy: [asc(learningStages.position), asc(learningStages.id)],
        with: {
          modules: {
            columns: { id: true },
            where: and(eq(learningModules.status, 'published'), isNull(learningModules.archivedAt)),
            with: {
              lessons: {
                columns: { id: true, countsTowardProgress: true },
                where: and(
                  eq(learningLessons.status, 'published'),
                  isNull(learningLessons.archivedAt),
                ),
              },
            },
          },
        },
      },
    },
  });
  if (!track) return 'Esta aula não está disponível.';
  const lessonIds = track.stages.flatMap((stage) =>
    stage.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
  );
  const completed = lessonIds.length
    ? await db.query.learningLessonProgress.findMany({
        columns: { lessonId: true },
        where: and(
          eq(learningLessonProgress.userId, userId),
          inArray(learningLessonProgress.lessonId, lessonIds),
          isNotNull(learningLessonProgress.completedAt),
        ),
      })
    : [];
  const completedIds = new Set(completed.map((item) => item.lessonId));
  const access = resolveSequentialStageAccess(
    track.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      lessons: stage.modules.flatMap((module) =>
        module.lessons
          .filter((lesson) => lesson.countsTowardProgress)
          .map((lesson) => ({ completed: completedIds.has(lesson.id) })),
      ),
    })),
  ).find((stage) => stage.stageId === stageId);

  if (track.kind !== 'method' || access?.isUnlocked) return null;
  return access?.lockMessage ?? 'Conclua a etapa anterior para abrir esta aula.';
}

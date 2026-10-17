import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { learningLessonProgress } from '@/server/db/schema';
import { getPublishedSllTrack } from './published-track';
import { resolveSequentialStageAccess } from '../progress-rules';
import { isPlanReferenceAvailable } from '../lesson-access';
import { hasAssistantLessonReference } from '@/features/assistant/server/plans';

// Fica fora do arquivo 'use server': exportada de lá, viraria uma ação que qualquer
// navegador pode chamar. Aqui ela serve às ações de progresso e à rota de materiais.
/**
 * Quais etapas da trilha publicada estão abertas pra aluna, pelo progresso gravado. Só o Método
 * tranca etapas; nas outras trilhas, tudo fica aberto. `null`: trilha fora do ar.
 */
export async function getTrackStageAccess(userId: string, trackId: string) {
  const track = await getPublishedSllTrack(trackId);
  if (!track) return null;
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
  const stages = resolveSequentialStageAccess(
    track.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      lessons: stage.modules.flatMap((module) =>
        module.lessons
          .filter((lesson) => lesson.countsTowardProgress)
          .map((lesson) => ({ completed: completedIds.has(lesson.id) })),
      ),
    })),
  ).map((access, index) => ({
    ...access,
    title: track.stages[index]!.title,
    slug: track.stages[index]!.slug,
    relatedLessonIds: track.stages[index]!.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.relatedLessonId),
    ),
    ...(track.kind === 'method' ? {} : { isUnlocked: true, lockMessage: null }),
  }));
  return { kind: track.kind, stages };
}

/** Reconfere a etapa no servidor para que um link direto não contorne o bloqueio. */
export async function getStageLockMessage(userId: string, trackId: string, stageId: string) {
  const track = await getTrackStageAccess(userId, trackId);
  if (!track) return 'Esta aula não está disponível.';
  const access = track.stages.find((stage) => stage.stageId === stageId);
  if (track.kind !== 'method' || access?.isUnlocked) return null;
  return access?.lockMessage ?? 'Conclua a etapa anterior para abrir esta aula.';
}

/** A exceção vem de uma ação publicada e aberta no banco, nunca de um parâmetro do navegador. */
export async function getLessonLockMessage(
  userId: string,
  trackId: string,
  stageId: string,
  lessonId: string,
) {
  const track = await getTrackStageAccess(userId, trackId);
  return getLessonLockMessageForTrack(userId, track, stageId, lessonId);
}

/** A lista de materiais reaproveita a trilha já lida e aplica as mesmas exceções da aula. */
export async function getLessonLockMessageForTrack(
  userId: string,
  track: Awaited<ReturnType<typeof getTrackStageAccess>>,
  stageId: string,
  lessonId: string,
) {
  if (!track) return 'Esta aula não está disponível.';
  const access = track.stages.find((stage) => stage.stageId === stageId);
  if (
    track.kind !== 'method' ||
    access?.isUnlocked ||
    isPlanReferenceAvailable(track.stages, lessonId) ||
    (await hasAssistantLessonReference(userId, lessonId))
  )
    return null;
  return access?.lockMessage ?? 'Conclua a etapa anterior para abrir esta aula.';
}

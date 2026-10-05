'use server';

import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import {
  learningLessonProgress,
  learningLessons,
  learningModules,
  learningStages,
  learningTrackProgress,
  learningTracks,
} from '@/server/db/schema';
import {
  parseProgressLocation,
  parseProgressPosition,
  resolveSequentialStageAccess,
} from '../progress-rules';

export type SllProgressActionResult = { saved: boolean; message: string };

/** Confere a trilha publicada inteira antes de gravar qualquer progresso. */
async function lessonIsAvailable(trackId: string, lessonId: string) {
  const lesson = await db.query.learningLessons.findFirst({
    columns: { id: true, status: true, archivedAt: true },
    where: and(eq(learningLessons.id, lessonId), isNull(learningLessons.archivedAt)),
    with: {
      module: {
        columns: { status: true, archivedAt: true },
        with: {
          stage: {
            columns: { id: true, status: true, archivedAt: true },
            with: {
              track: { columns: { id: true, kind: true, status: true, archivedAt: true } },
            },
          },
        },
      },
    },
  });

  const available = Boolean(
    lesson &&
    lesson.status === 'published' &&
    lesson.module.archivedAt === null &&
    lesson.module.status === 'published' &&
    lesson.module.stage.archivedAt === null &&
    lesson.module.stage.status === 'published' &&
    lesson.module.stage.track.id === trackId &&
    lesson.module.stage.track.archivedAt === null &&
    lesson.module.stage.track.status === 'published',
  );
  if (!available || !lesson) return null;
  return { stageId: lesson.module.stage.id, trackKind: lesson.module.stage.track.kind };
}

/** Reconfere a etapa no servidor para que um link direto não contorne o bloqueio. */
async function getStageLockMessage(userId: string, trackId: string, stageId: string) {
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

/** Registra a aula aberta sem apagar a posição ou a conclusão já salvas. */
export async function recordSllLessonView(
  trackId: string,
  lessonId: string,
): Promise<SllProgressActionResult> {
  const { userId } = await requireProductAction('sll');
  const location = parseProgressLocation(trackId, lessonId);
  const lesson = location ? await lessonIsAvailable(location.trackId, location.lessonId) : null;
  if (!location || !lesson) return { saved: false, message: 'Esta aula não está disponível.' };
  const lockMessage = await getStageLockMessage(userId, location.trackId, lesson.stageId);
  if (lockMessage) return { saved: false, message: lockMessage };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(learningLessonProgress)
      .values({ userId, lessonId: location.lessonId, lastViewedAt: now })
      .onConflictDoUpdate({
        target: [learningLessonProgress.userId, learningLessonProgress.lessonId],
        set: { lastViewedAt: now, updatedAt: now },
      });
    await tx
      .insert(learningTrackProgress)
      .values({
        userId,
        trackId: location.trackId,
        currentLessonId: location.lessonId,
        lastAccessedAt: now,
      })
      .onConflictDoUpdate({
        target: [learningTrackProgress.userId, learningTrackProgress.trackId],
        set: { currentLessonId: location.lessonId, lastAccessedAt: now, updatedAt: now },
      });
  });
  revalidatePath('/sll');
  return { saved: true, message: '' };
}

/** Guarda o ponto do vídeo para a aluna continuar de onde parou. */
export async function saveSllLessonPosition(
  trackId: string,
  lessonId: string,
  rawPositionSeconds: number,
): Promise<SllProgressActionResult> {
  const { userId } = await requireProductAction('sll');
  const location = parseProgressLocation(trackId, lessonId);
  const position = parseProgressPosition(rawPositionSeconds);
  const lesson = location ? await lessonIsAvailable(location.trackId, location.lessonId) : null;
  if (!location || position === null || !lesson)
    return { saved: false, message: 'Não foi possível salvar o ponto da aula.' };
  const lockMessage = await getStageLockMessage(userId, location.trackId, lesson.stageId);
  if (lockMessage) return { saved: false, message: lockMessage };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(learningLessonProgress)
      .values({
        userId,
        lessonId: location.lessonId,
        lastPositionSeconds: position,
        lastViewedAt: now,
      })
      .onConflictDoUpdate({
        target: [learningLessonProgress.userId, learningLessonProgress.lessonId],
        set: { lastPositionSeconds: position, lastViewedAt: now, updatedAt: now },
      });
    await tx
      .insert(learningTrackProgress)
      .values({
        userId,
        trackId: location.trackId,
        currentLessonId: location.lessonId,
        lastAccessedAt: now,
      })
      .onConflictDoUpdate({
        target: [learningTrackProgress.userId, learningTrackProgress.trackId],
        set: { currentLessonId: location.lessonId, lastAccessedAt: now, updatedAt: now },
      });
  });
  return { saved: true, message: '' };
}

/** Marca uma aula como concluída uma única vez e atualiza o ponto mais recente da trilha. */
export async function completeSllLesson(
  trackId: string,
  lessonId: string,
): Promise<SllProgressActionResult> {
  const { userId } = await requireProductAction('sll');
  const location = parseProgressLocation(trackId, lessonId);
  const lesson = location ? await lessonIsAvailable(location.trackId, location.lessonId) : null;
  if (!location || !lesson) return { saved: false, message: 'Esta aula não está disponível.' };
  const lockMessage = await getStageLockMessage(userId, location.trackId, lesson.stageId);
  if (lockMessage) return { saved: false, message: lockMessage };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(learningLessonProgress)
      .values({
        userId,
        lessonId: location.lessonId,
        lastPositionSeconds: 0,
        completedAt: now,
        lastViewedAt: now,
      })
      .onConflictDoUpdate({
        target: [learningLessonProgress.userId, learningLessonProgress.lessonId],
        set: {
          lastPositionSeconds: 0,
          completedAt: sql`coalesce(${learningLessonProgress.completedAt}, ${now})`,
          lastViewedAt: now,
          updatedAt: now,
        },
      });
    await tx
      .insert(learningTrackProgress)
      .values({
        userId,
        trackId: location.trackId,
        currentLessonId: location.lessonId,
        lastAccessedAt: now,
      })
      .onConflictDoUpdate({
        target: [learningTrackProgress.userId, learningTrackProgress.trackId],
        set: { currentLessonId: location.lessonId, lastAccessedAt: now, updatedAt: now },
      });
  });
  revalidatePath('/sll');
  return { saved: true, message: 'A aula foi marcada como concluída.' };
}

/** Adapta a conclusão ao formulário e permite mostrar o retorno da ação para a aluna. */
export async function completeSllLessonForm(
  _previous: SllProgressActionResult,
  formData: FormData,
): Promise<SllProgressActionResult> {
  const trackId = formData.get('trackId');
  const lessonId = formData.get('lessonId');
  if (typeof trackId !== 'string' || typeof lessonId !== 'string') {
    return { saved: false, message: 'Não foi possível identificar esta aula.' };
  }
  return completeSllLesson(trackId, lessonId);
}

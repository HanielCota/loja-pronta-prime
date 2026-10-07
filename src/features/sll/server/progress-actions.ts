'use server';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import { learningLessonProgress, learningLessons, learningTrackProgress } from '@/server/db/schema';
import {
  parseProgressLocation,
  parseProgressPosition,
  undoCompletionMessage,
} from '../progress-rules';
import { getStageLockMessage, getTrackStageAccess } from './stage-lock';

export type SllProgressActionResult = { saved: boolean; message: string; completed?: boolean };

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

/** Atualiza a conclusão da aula sem apagar o restante do progresso salvo. */
export async function setSllLessonCompletion(
  trackId: string,
  lessonId: string,
  completed: boolean,
): Promise<SllProgressActionResult> {
  const { userId } = await requireProductAction('sll');
  // A ação pode ser chamada diretamente: tipos TypeScript não validam o pedido recebido.
  if (typeof completed !== 'boolean')
    return { saved: false, message: 'Não foi possível salvar a conclusão da aula.' };
  const location = parseProgressLocation(trackId, lessonId);
  const lesson = location ? await lessonIsAvailable(location.trackId, location.lessonId) : null;
  if (!location || !lesson) return { saved: false, message: 'Esta aula não está disponível.' };
  const lockMessage = await getStageLockMessage(userId, location.trackId, lesson.stageId);
  if (lockMessage) return { saved: false, message: lockMessage };

  const now = new Date();
  const existingProgress = await db.query.learningLessonProgress.findFirst({
    columns: { completedAt: true },
    where: and(
      eq(learningLessonProgress.userId, userId),
      eq(learningLessonProgress.lessonId, location.lessonId),
    ),
  });
  const wasCompleted =
    existingProgress?.completedAt !== null && existingProgress?.completedAt !== undefined;
  if (!completed) {
    // Só o Método tranca etapas: nas outras trilhas, desfazer nunca fecha nada.
    const before =
      lesson.trackKind === 'method' ? await getTrackStageAccess(userId, location.trackId) : null;
    await db
      .update(learningLessonProgress)
      .set({ completedAt: null, updatedAt: now })
      .where(
        and(
          eq(learningLessonProgress.userId, userId),
          eq(learningLessonProgress.lessonId, location.lessonId),
        ),
      );
    const after = before ? await getTrackStageAccess(userId, location.trackId) : null;
    revalidatePath('/sll');
    revalidatePath('/sll/metodo');
    revalidatePath(`/sll/metodo/etapa/${lesson.stageId}`);
    return {
      saved: true,
      message: undoCompletionMessage(before?.stages ?? [], after?.stages ?? []),
      completed: false,
    };
  }

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
  revalidatePath('/sll/metodo');
  revalidatePath(`/sll/metodo/etapa/${lesson.stageId}`);

  if (!wasCompleted && lesson.trackKind === 'method') {
    const access = await getTrackStageAccess(userId, location.trackId);
    const currentStageIndex =
      access?.stages.findIndex((stage) => stage.stageId === lesson.stageId) ?? -1;
    const currentStage = currentStageIndex >= 0 ? access?.stages[currentStageIndex] : undefined;
    const nextStage = currentStageIndex >= 0 ? access?.stages[currentStageIndex + 1] : undefined;
    if (currentStage?.isComplete) {
      if (nextStage?.isUnlocked && nextStage.totalCount > 0) {
        revalidatePath(`/sll/metodo/etapa/${nextStage.stageId}`);
        redirect(`/sll/metodo/etapa/${nextStage.stageId}`);
      }
      return {
        saved: true,
        message: nextStage
          ? 'A aula foi marcada como concluída. A etapa foi concluída. A próxima etapa ainda está em preparação.'
          : 'A aula foi marcada como concluída. Você concluiu a última etapa do Método SLL.',
        completed: true,
      };
    }
  }

  return { saved: true, message: 'A aula foi marcada como concluída.', completed: true };
}

/** Define se a aula está concluída e informa o resultado à aluna. */
export async function setSllLessonCompletionForm(
  previous: SllProgressActionResult,
  formData: FormData,
): Promise<SllProgressActionResult> {
  const trackId = formData.get('trackId');
  const lessonId = formData.get('lessonId');
  const completedValue = formData.get('completed');
  if (
    typeof trackId !== 'string' ||
    typeof lessonId !== 'string' ||
    (completedValue !== 'true' && completedValue !== 'false')
  ) {
    return { saved: false, message: 'Não foi possível identificar esta aula.' };
  }
  try {
    const result = await setSllLessonCompletion(trackId, lessonId, completedValue === 'true');
    // Uma falha não deve apagar a conclusão que já estava visível antes do envio.
    return result.saved
      ? result
      : {
          ...result,
          ...(previous.completed !== undefined ? { completed: previous.completed } : {}),
        };
  } catch (error) {
    // Redirecionamentos de acesso continuam valendo; só falhas operacionais viram mensagem.
    unstable_rethrow(error);
    console.error('[sll] falha ao salvar conclusão');
    return {
      saved: false,
      message: 'Não foi possível salvar a conclusão. Tente novamente.',
      ...(previous.completed !== undefined ? { completed: previous.completed } : {}),
    };
  }
}

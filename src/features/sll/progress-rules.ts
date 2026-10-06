export type LessonProgressRecord = {
  lessonId: string;
  lastPositionSeconds: number;
  completedAt: Date | null;
  lastViewedAt: Date | null;
};

export type TrackLessonRecord = { id: string; countsTowardProgress?: boolean };

export type StageProgressRecord = {
  id: string;
  title: string;
  lessons: { completed: boolean }[];
};

/**
 * A próxima etapa só abre quando a anterior tem todas as aulas concluídas. Etapa sem aula
 * que conta não é marcada como concluída, mas também não trava as seguintes: senão a aluna
 * ficaria presa numa etapa sem nada pra fazer (por exemplo, quando a última aula é arquivada).
 */
export function resolveSequentialStageAccess(stages: StageProgressRecord[]) {
  let previousComplete = true;
  let previousTitle = '';

  return stages.map((stage) => {
    const totalCount = stage.lessons.length;
    const completedCount = stage.lessons.filter((lesson) => lesson.completed).length;
    const isComplete = totalCount > 0 && completedCount === totalCount;
    const isUnlocked = previousComplete;
    const access = {
      isComplete,
      isUnlocked,
      completedCount,
      totalCount,
      lockMessage: isUnlocked ? null : `Conclua ${previousTitle} para abrir ${stage.title}.`,
    };

    if (totalCount > 0) {
      previousComplete = isComplete;
      previousTitle = stage.title;
    }
    return { stageId: stage.id, ...access };
  });
}

export function isProgressId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Valida identificadores recebidos do navegador antes de consultar ou gravar progresso. */
export function parseProgressLocation(trackId: unknown, lessonId: unknown) {
  if (!isProgressId(trackId) || !isProgressId(lessonId)) return null;
  return { trackId, lessonId };
}

/** Posições inválidas não podem virar saltos negativos nem valores fora do vídeo. */
export function parseProgressPosition(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 86_400
    ? value
    : null;
}

/** Soma as aulas disponíveis e escolhe um ponto de retomada sem contar conteúdo não publicado. */
export function summarizeTrackProgress(
  lessons: TrackLessonRecord[],
  progress: LessonProgressRecord[],
  currentLessonId: string | null,
) {
  const byLesson = new Map(progress.map((item) => [item.lessonId, item]));
  const items = lessons.map((lesson) => {
    const saved = byLesson.get(lesson.id);
    return {
      lessonId: lesson.id,
      completedAt: saved?.completedAt ?? null,
      lastPositionSeconds: saved?.lastPositionSeconds ?? 0,
      lastViewedAt: saved?.lastViewedAt ?? null,
    };
  });
  const counted = items.filter(
    (item) => lessons.find((lesson) => lesson.id === item.lessonId)?.countsTowardProgress !== false,
  );
  const completedCount = counted.filter((item) => item.completedAt !== null).length;
  const firstIncomplete = counted.find((item) => item.completedAt === null);
  const current = items.find((item) => item.lessonId === currentLessonId);
  const resume =
    current?.completedAt === null && current ? current : (firstIncomplete ?? items.at(-1) ?? null);

  return {
    lessons: items,
    completedCount,
    totalCount: counted.length,
    resumeLessonId: resume?.lessonId ?? null,
    resumePositionSeconds: resume?.lastPositionSeconds ?? 0,
  };
}

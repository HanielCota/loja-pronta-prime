type PlanReferenceStage = {
  slug: string;
  isUnlocked: boolean;
  relatedLessonIds: (string | null)[];
};

/** Uma ação do plano aberto pode consultar sua aula de apoio sem abrir toda a etapa seguinte. */
export function isPlanReferenceAvailable(stages: PlanReferenceStage[], lessonId: string): boolean {
  return stages.some(
    (stage) =>
      stage.slug === 'etapa-2' && stage.isUnlocked && stage.relatedLessonIds.includes(lessonId),
  );
}

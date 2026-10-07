type PlanModule<Lesson> = {
  id: string;
  slug: string;
  title: string;
  lessons: Lesson[];
};

/** Nenhuma ação publicada some do plano quando o admin muda a quantidade ou a obrigatoriedade. */
export function splitPlanModules<Lesson extends { countsTowardProgress: boolean }>(
  modules: PlanModule<Lesson>[],
) {
  const requiredModules = modules
    .map((module) => ({
      ...module,
      lessons: module.lessons.filter((lesson) => lesson.countsTowardProgress),
    }))
    .filter((module) => module.slug !== 'acoes-complementares' || module.lessons.length > 0);
  const optionalLessons = modules.flatMap((module) =>
    module.lessons.filter((lesson) => !lesson.countsTowardProgress),
  );
  return { requiredModules, optionalLessons };
}

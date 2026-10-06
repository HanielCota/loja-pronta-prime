export type LibraryModule = {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string; description: string | null; completed: boolean }>;
};

const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLocaleLowerCase('pt-BR');

/** Quem escreve "avaliacoes" deve encontrar "avaliações", sem perder a ordem das aulas. */
export function filterLibraryModules(modules: LibraryModule[], query: string): LibraryModule[] {
  const search = normalize(query);
  return modules
    .map((module) => ({
      ...module,
      lessons: module.lessons.filter((lesson) =>
        normalize(`${module.title} ${lesson.title} ${lesson.description ?? ''}`).includes(search),
      ),
    }))
    .filter((module) => module.lessons.length > 0);
}

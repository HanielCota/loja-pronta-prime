export type SllLessonKind = 'welcome' | 'method' | 'complementary_course';

/** Mantém as boas-vindas na própria trilha; as outras aulas conservam a rota existente. */
export function sllLessonHref(kind: SllLessonKind, lessonId: string, returnTo?: string) {
  const id = encodeURIComponent(lessonId);
  const path = kind === 'welcome' ? `/sll/comece-aqui?aula=${id}` : `/sll/aula/${id}`;
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) return path;
  return `${path}${path.includes('?') ? '&' : '?'}voltar=${encodeURIComponent(returnTo)}`;
}

/** Retorna à mesma categoria e ao cartão aberto na Biblioteca, sem perder a busca confirmada. */
export function sllLibraryLessonHref(
  stageId: string,
  lessonId: string,
  moduleId: string,
  query = '',
) {
  const search = query ? `?q=${encodeURIComponent(query)}` : '';
  const returnTo = `/sll/metodo/etapa/${encodeURIComponent(stageId)}${search}#library-lesson-${encodeURIComponent(moduleId)}-${encodeURIComponent(lessonId)}`;
  return sllLessonHref('method', lessonId, returnTo);
}

/** Atualiza o cartão de retorno ao trocar de aula sem perder busca ou categoria. */
export function sllLibraryReturnHref(returnTo: string, moduleId: string, lessonId: string) {
  const hashIndex = returnTo.indexOf('#');
  if (hashIndex < 0 || !returnTo.slice(hashIndex).startsWith('#library-lesson-')) return returnTo;
  return `${returnTo.slice(0, hashIndex)}#library-lesson-${encodeURIComponent(moduleId)}-${encodeURIComponent(lessonId)}`;
}

export type OrderedSllLesson = { id: string; moduleId: string };

/**
 * A sequência é dos dados publicados, não do número antigo da aula. Assim, a passagem entre
 * passos continua certa quando uma aula é inserida, arquivada ou reordenada no admin.
 */
export function getAdjacentSllLessons(lessons: OrderedSllLesson[], currentId: string) {
  const currentIndex = lessons.findIndex((lesson) => lesson.id === currentId);
  if (currentIndex < 0) return { previous: null, next: null };

  const current = lessons[currentIndex]!;
  const previous = lessons[currentIndex - 1] ?? null;
  const next = lessons[currentIndex + 1] ?? null;

  return {
    previous: previous
      ? { ...previous, crossesModule: previous.moduleId !== current.moduleId }
      : null,
    next: next ? { ...next, crossesModule: next.moduleId !== current.moduleId } : null,
  };
}

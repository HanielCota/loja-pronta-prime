const LESSON_PREFIX = '/sll/aula/';

type SidebarStage = { href: string; lessonIds: readonly string[] };

/**
 * A seção do menu do SLL que representa o endereço atual. Quase sempre é o próprio endereço; a
 * aula não tem link no menu e marca de onde ela vem: a etapa do Método que tem aquela aula ou,
 * fora do Método, Cursos. A conta é feita no navegador, pela moldura que mora no `layout.tsx`
 * (a moldura não sabe qual aula a página abriu).
 */
export function sllSidebarSection(pathname: string, stages: readonly SidebarStage[]): string {
  if (!pathname.startsWith(LESSON_PREFIX)) return pathname;
  const lessonId = pathname.slice(LESSON_PREFIX.length).split('/')[0];
  if (!lessonId) return pathname;
  const stage = stages.find((item) => item.lessonIds.includes(lessonId));
  if (!stage) return '/sll/cursos';
  return stage.href;
}

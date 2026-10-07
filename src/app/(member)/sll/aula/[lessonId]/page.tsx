import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { SllLessonViewer } from '@/features/sll/components/sll-lesson-viewer';
import { getSllLessonViewer } from '@/features/sll/server/lesson-viewer';
import { sllLessonHref } from '@/features/sll/lesson-navigation';

export const metadata: Metadata = { title: 'Aula do SLL' };

/** Aula publicada do SLL, com acesso validado antes de carregar materiais. */
export default async function SllLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ voltar?: string | string[] }>;
}) {
  const { lessonId } = await params;
  const { voltar } = await searchParams;
  const returnHref =
    typeof voltar === 'string' && voltar.startsWith('/') && !voltar.startsWith('//')
      ? voltar
      : null;
  const data = await getSllLessonViewer(lessonId);
  if (!data) notFound();
  // Links antigos continuam abrindo a mesma aula, agora dentro da trilha de boas-vindas.
  if (data.track.kind === 'welcome') redirect(sllLessonHref('welcome', data.lesson.id));
  // A aula não tem link no menu: marca de onde ela vem (a etapa do Método, Comece aqui ou Cursos).
  const currentSection =
    data.track.kind === 'method' ? `/sll/metodo/etapa/${data.stage.id}` : '/sll/cursos';
  const defaultBackLink =
    data.track.kind === 'method'
      ? { href: `/sll/metodo/etapa/${data.stage.id}`, label: 'Voltar às aulas da etapa' }
      : { href: `/sll/cursos/${data.track.slug}`, label: 'Voltar às aulas do curso' };
  const isLibraryReturn = Boolean(returnHref?.includes('#library-lesson-'));

  return (
    <SllAreaShell
      account={data.user}
      currentSection={currentSection}
      hasChoice={data.hasChoice}
      title={data.track.title}
      intro="Assista à aula e acompanhe seu progresso."
      backLink={
        returnHref
          ? {
              href: returnHref,
              label: isLibraryReturn ? 'Voltar à biblioteca' : 'Voltar ao plano',
            }
          : defaultBackLink
      }
    >
      <SllLessonViewer key={data.lesson.id} data={{ ...data, returnHref }} />
    </SllAreaShell>
  );
}

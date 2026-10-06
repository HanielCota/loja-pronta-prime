import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { SllLessonViewer } from '@/features/sll/components/sll-lesson-viewer';
import { getSllLessonViewer } from '@/features/sll/server/lesson-viewer';

export const metadata: Metadata = { title: 'Aula do SLL' };

/** Aula publicada do SLL, com acesso validado antes de carregar materiais. */
export default async function SllLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const data = await getSllLessonViewer(lessonId);
  if (!data) notFound();
  // A aula não tem link no menu: marca de onde ela vem (a etapa do Método, Comece aqui ou Cursos).
  const currentSection =
    data.track.kind === 'method'
      ? `/sll/metodo/etapa/${data.stage.id}`
      : data.track.kind === 'welcome'
        ? '/sll/comece-aqui'
        : '/sll/cursos';

  return (
    <SllAreaShell
      account={data.user}
      currentSection={currentSection}
      hasChoice={data.hasChoice}
      title={data.track.title}
      intro="Assista à aula e acompanhe seu progresso."
      backLink={
        data.track.kind === 'method'
          ? { href: `/sll/metodo/etapa/${data.stage.id}`, label: 'Voltar às aulas da etapa' }
          : data.track.kind === 'welcome'
            ? { href: '/sll/comece-aqui', label: 'Voltar ao Comece aqui' }
            : { href: `/sll/cursos/${data.track.slug}`, label: 'Voltar às aulas do curso' }
      }
    >
      <SllLessonViewer key={data.lesson.id} data={data} />
    </SllAreaShell>
  );
}

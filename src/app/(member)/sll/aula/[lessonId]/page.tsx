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

  return (
    <SllAreaShell
      account={data.user}
      hasChoice={data.hasChoice}
      title={data.track.title}
      intro="Assista à aula e acompanhe seu progresso."
    >
      <SllLessonViewer data={data} />
    </SllAreaShell>
  );
}

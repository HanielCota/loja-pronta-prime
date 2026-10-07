import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { LessonPreview } from '@/features/admin/components/lesson-preview';
import { requireAdmin } from '@/features/admin/server/access';
import { getAdminLessonPreview } from '@/features/admin/server/learning-content';
import { z } from 'zod';

export const metadata: Metadata = { title: 'Prévia da aula' };

type PageProps = { params: Promise<{ lessonId: string }> };

/** Mostra materiais salvos para a administradora sem publicar a aula. */
export default async function AdminLessonPreviewPage({ params }: PageProps) {
  const session = await requireAdmin();
  const { lessonId } = await params;
  if (!z.uuid().safeParse(lessonId).success) notFound();
  const lesson = await getAdminLessonPreview(lessonId);
  if (!lesson) notFound();

  return (
    <AdminShell
      account={session.user}
      title="Prévia da aula"
      intro="Confira como o conteúdo cadastrado será apresentado à aluna."
    >
      <LessonPreview lesson={lesson} />
    </AdminShell>
  );
}

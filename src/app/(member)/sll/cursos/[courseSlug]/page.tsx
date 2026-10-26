import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { notFound } from 'next/navigation';
import { panelCard } from '@/features/member/components/area-shell';
import { SllPage } from '@/features/sll/sll-area-shell';
import { getSllPublishedCourse } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';
import { SllProgress } from '@/features/sll/components/sll-progress';
import { formatDuration } from '@/features/sll/duration';

export const metadata: Metadata = { title: 'Curso complementar · SLL' };

export default async function ComplementaryCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const [{ products }, course] = await Promise.all([
    requireProduct('sll'),
    getSllPublishedCourse(courseSlug),
  ]);
  if (!course) notFound();
  const lessons = course.stages.flatMap((stage) =>
    stage.modules.flatMap((module) => module.lessons),
  );
  const completedCount = lessons.filter((lesson) => lesson.completedAt !== null).length;

  return (
    <SllPage
      hasChoice={products.length > 1}
      title={course.title}
      intro={course.description ?? undefined}
      backLink={{ href: '/sll/cursos', label: 'Voltar aos cursos' }}
    >
      {lessons.length ? (
        <section className={`${panelCard} gap-4`} aria-label="Aulas do curso">
          <p className="text-body text-muted-foreground">
            {completedCount} de {lessons.length} aulas concluídas
          </p>
          <SllProgress
            label="Progresso do curso"
            completed={completedCount}
            total={lessons.length}
          />
          <ol className="flex flex-col divide-y divide-border border-t border-border">
            {lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <Link
                  className="flex min-h-14 items-center gap-3 rounded-2xl px-2 py-3 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors"
                  href={`/sll/aula/${lesson.id}`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-sm text-muted-foreground">
                    <span className="sr-only">Aula </span>
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{lesson.title}</span>
                    {lesson.durationMinutes ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(lesson.durationMinutes)}
                      </span>
                    ) : null}
                  </span>
                  {lesson.completedAt ? (
                    <Check aria-label="Concluída" className="size-5 text-progress-text" />
                  ) : (
                    <ArrowRight aria-hidden="true" className="size-5 text-link" />
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            As aulas deste curso ainda não foram publicadas.
          </p>
        </section>
      )}
    </SllPage>
  );
}

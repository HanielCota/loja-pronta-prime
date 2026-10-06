import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { getSllPublishedTracks } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Curso complementar · SLL' };

export default async function ComplementaryCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const [{ session, products }, courses] = await Promise.all([
    requireProduct('sll'),
    getSllPublishedTracks('complementary_course'),
  ]);
  const course = courses.find((item) => item.slug === courseSlug);
  if (!course) notFound();
  const lessons = course.stages.flatMap((stage) =>
    stage.modules.flatMap((module) => module.lessons),
  );
  const completedCount = lessons.filter((lesson) => lesson.completedAt !== null).length;

  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="sll"
      title={course.title}
      intro={course.description ?? undefined}
    >
      <Button asChild className="w-fit" size="inline" variant="ghost">
        <Link href="/sll/cursos">
          <ArrowLeft aria-hidden="true" /> Voltar aos cursos
        </Link>
      </Button>
      {lessons.length ? (
        <section className={panelCard} aria-label="Aulas do curso">
          <p className="text-body text-muted-foreground">
            {completedCount} de {lessons.length} aulas concluídas
          </p>
          <ol className="flex flex-col divide-y divide-border border-t border-border">
            {lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <Link
                  className="flex min-h-14 items-center gap-3 py-2 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={`/sll/aula/${lesson.id}`}
                >
                  <span className="min-w-0 flex-1">
                    Aula {index + 1} · {lesson.title}
                    {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ''}
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
    </AreaShell>
  );
}

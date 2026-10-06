import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { getSllPublishedTracks } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Cursos complementares · SLL' };

export default async function ComplementaryCoursesPage() {
  const [{ session, products }, courses] = await Promise.all([
    requireProduct('sll'),
    getSllPublishedTracks('complementary_course'),
  ]);

  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="sll"
      title="Cursos complementares"
      intro="Aprofundamentos opcionais para a sua loja na Shopee."
    >
      {courses.length ? (
        <section aria-label="Cursos Shopee" className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => {
            const lessons = course.stages.flatMap((stage) =>
              stage.modules.flatMap((module) => module.lessons),
            );
            const minutes = lessons.reduce(
              (total, lesson) => total + (lesson.durationMinutes ?? 0),
              0,
            );
            return (
              <article className={panelCard} key={course.id}>
                <BookOpen aria-hidden="true" className="size-6 text-link" />
                <h2 className="text-title font-semibold text-foreground">{course.title}</h2>
                {course.description ? (
                  <p className="text-body text-muted-foreground">{course.description}</p>
                ) : null}
                <p className="text-body text-muted-foreground">
                  {lessons.length} aulas{minutes ? ` · ${minutes} min` : ''}
                </p>
                {lessons.length ? (
                  <Button asChild className="mt-2">
                    <Link href={`/sll/cursos/${course.slug}`}>
                      Abrir curso <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <p className="text-body text-muted-foreground">
                    As aulas deste curso ainda não estão disponíveis.
                  </p>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            Os cursos complementares Shopee ainda não estão disponíveis.
          </p>
        </section>
      )}
    </AreaShell>
  );
}

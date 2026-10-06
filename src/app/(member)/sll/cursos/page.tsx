import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllPublishedTracks } from '@/features/sll/server/catalog';
import { getSllCopy } from '@/features/sll/server/copy';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Cursos complementares · SLL' };

export default async function ComplementaryCoursesPage() {
  const [{ session, products }, courses, copy] = await Promise.all([
    requireProduct('sll'),
    getSllPublishedTracks('complementary_course'),
    getSllCopy(),
  ]);
  const catalog = courses.map((course) => {
    const lessons = course.stages.flatMap((stage) =>
      stage.modules.flatMap((module) => module.lessons),
    );
    const minutes = lessons.reduce((total, lesson) => total + (lesson.durationMinutes ?? 0), 0);
    return { course, lessonCount: lessons.length, minutes };
  });
  const featured = catalog.find(({ course }) => course.featured);

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={copy.coursesTitle}
      intro={copy.coursesIntro}
    >
      {catalog.length ? (
        <div className="flex flex-col gap-9">
          {featured ? (
            <section aria-labelledby="featured-course-title">
              <h2
                id="featured-course-title"
                className="mb-4 text-body font-semibold text-foreground"
              >
                {copy.coursesFeaturedTitle}
              </h2>
              <article className={`${panelCard} gap-4 sm:flex-row sm:items-center`}>
                {featured.course.coverStorageKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={featured.course.coverAlt ?? ''}
                    className="aspect-video w-full rounded-2xl object-cover sm:w-64"
                    src={`/api/sll/course-cover/${featured.course.id}`}
                  />
                ) : null}
                <BookOpen aria-hidden="true" className="size-7 shrink-0 text-link" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-title font-semibold text-balance text-foreground">
                    {featured.course.title}
                  </h3>
                  {featured.course.description ? (
                    <p className="mt-1 text-body text-muted-foreground">
                      {featured.course.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-body text-muted-foreground">
                    {featured.lessonCount} aulas
                    {featured.minutes ? ` · ${featured.minutes} min` : ''}
                  </p>
                </div>
                {featured.lessonCount ? (
                  <Button asChild className="sm:w-auto" variant="soft">
                    <Link href={`/sll/cursos/${featured.course.slug}`}>
                      Abrir curso <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </article>
            </section>
          ) : null}
          <section aria-labelledby="all-courses-title">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="all-courses-title" className="text-body font-semibold text-foreground">
                {copy.coursesLibraryTitle}
              </h2>
              <p className="text-body text-muted-foreground">
                {catalog.length} {catalog.length === 1 ? 'curso' : 'cursos'}
              </p>
            </div>
            <ul className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2">
              {catalog.map(({ course, lessonCount, minutes }) => (
                <li className={`${panelCard} h-full gap-3`} key={course.id}>
                  {course.coverStorageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={course.coverAlt ?? ''}
                      className="aspect-video w-full rounded-2xl object-cover"
                      src={`/api/sll/course-cover/${course.id}`}
                    />
                  ) : null}
                  <h3 className="text-body font-semibold text-foreground">{course.title}</h3>
                  {course.description ? (
                    <p className="text-body text-muted-foreground">{course.description}</p>
                  ) : null}
                  <p className="text-body text-muted-foreground">
                    {lessonCount} aulas{minutes ? ` · ${minutes} min` : ''}
                  </p>
                  {lessonCount ? (
                    <Button asChild className="mt-auto" variant="soft">
                      <Link href={`/sll/cursos/${course.slug}`}>
                        Abrir curso <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <p className="mt-auto text-body text-muted-foreground">Aulas em breve</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            Os cursos complementares Shopee ainda não estão disponíveis.
          </p>
        </section>
      )}
    </SllAreaShell>
  );
}

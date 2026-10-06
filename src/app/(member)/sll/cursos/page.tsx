import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllPublishedTracks } from '@/features/sll/server/catalog';
import { getSllCopy } from '@/features/sll/server/copy';
import { requireProduct } from '@/features/products/server/access';
import { SllProgress } from '@/features/sll/components/sll-progress';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Cursos complementares · SLL' };

/** "1 aula · 12 min", "8 aulas". Sem aula publicada, nada: o cartão já diz "Aulas em breve". */
function lessonSummary(lessonCount: number, minutes: number) {
  if (!lessonCount) return null;
  return `${lessonCount} ${lessonCount === 1 ? 'aula' : 'aulas'}${minutes ? ` · ${minutes} min` : ''}`;
}

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
    // O cartão e a lista contam todas as aulas publicadas, inclusive as opcionais.
    // O resumo principal da trilha exclui opcionais e não serve para este denominador.
    const completedCount = lessons.filter((lesson) => lesson.completedAt !== null).length;
    return { course, lessonCount: lessons.length, completedCount, minutes };
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
        <div className="flex flex-col gap-6">
          {featured ? (
            <section aria-labelledby="featured-course-title">
              <h2
                id="featured-course-title"
                className="mb-4 text-body font-semibold text-foreground"
              >
                {copy.coursesFeaturedTitle}
              </h2>
              <article
                className={cn(
                  panelCard,
                  'gap-4 p-5 sm:p-5',
                  featured.course.coverStorageKey &&
                    'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center',
                )}
              >
                {featured.course.coverStorageKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={featured.course.coverAlt ?? ''}
                    className="aspect-video w-full rounded-2xl object-cover"
                    width={1280}
                    height={720}
                    src={`/api/sll/course-cover/${featured.course.id}`}
                  />
                ) : (
                  <CourseCoverPlaceholder />
                )}
                <div className="flex min-w-0 flex-col items-start gap-3">
                  <h3 className="text-title font-semibold text-balance text-foreground">
                    {featured.course.title}
                  </h3>
                  {featured.course.description ? (
                    <p className="mt-1 text-body text-muted-foreground">
                      {featured.course.description}
                    </p>
                  ) : null}
                  {featured.lessonCount ? (
                    <p className="text-sm text-muted-foreground">
                      {lessonSummary(featured.lessonCount, featured.minutes)}
                    </p>
                  ) : null}
                  {/* Igual aos cartões da lista: sem aula publicada, diz que vem aí em vez de
                    sumir com o botão sem explicar. */}
                  {featured.lessonCount ? (
                    <Button asChild className="mt-2 sm:w-auto" variant="soft">
                      <Link href={`/sll/cursos/${featured.course.slug}`}>
                        Abrir curso <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-body text-muted-foreground">Aulas em breve</p>
                  )}
                </div>
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
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] items-start gap-4">
              {catalog.map(({ course, lessonCount, completedCount, minutes }) => (
                <li className={cn(panelCard, 'gap-3 p-5 sm:p-5')} key={course.id}>
                  {course.coverStorageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={course.coverAlt ?? ''}
                      className="aspect-video w-full rounded-2xl object-cover"
                      width={1280}
                      height={720}
                      loading="lazy"
                      src={`/api/sll/course-cover/${course.id}`}
                    />
                  ) : (
                    <CourseCoverPlaceholder />
                  )}
                  <h3 className="text-xl leading-snug font-semibold text-balance text-foreground">
                    {course.title}
                  </h3>
                  {course.description ? (
                    <p className="text-body text-muted-foreground">{course.description}</p>
                  ) : null}
                  {lessonCount ? (
                    <p className="text-sm text-muted-foreground">
                      {lessonSummary(lessonCount, minutes)}
                    </p>
                  ) : null}
                  {lessonCount ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        {completedCount} de {lessonCount} aulas concluídas
                      </p>
                      <SllProgress
                        label={`Progresso de ${course.title}`}
                        completed={completedCount}
                        total={lessonCount}
                      />
                    </div>
                  ) : null}
                  {lessonCount ? (
                    <Button asChild variant="soft">
                      <Link href={`/sll/cursos/${course.slug}`}>
                        {completedCount === lessonCount
                          ? 'Revisar curso'
                          : completedCount
                            ? 'Continuar curso'
                            : 'Abrir curso'}{' '}
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-body text-muted-foreground">Aulas em breve</p>
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

/** Sem arquivo, o aviso ocupa só o necessário; a proporção 16:9 fica para a capa real. */
function CourseCoverPlaceholder() {
  return (
    <div className="flex w-full items-center gap-2 rounded-2xl bg-muted p-3 text-muted-foreground">
      <BookOpen aria-hidden="true" className="size-5 shrink-0" />
      <span className="text-sm">Capa em breve</span>
    </div>
  );
}

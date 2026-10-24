import { courseCoverSrc } from '@/features/sll/course-cover';
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
import { formatDuration } from '@/features/sll/duration';
import { SLL_COPY } from '@/features/sll/copy';

export const metadata: Metadata = { title: 'Cursos complementares · SLL' };

/** "1 aula · 12 min", "11 aulas · 2 h 47 min", "8 aulas". Sem aula publicada, nada: o cartão já diz "Aulas em breve". */
function lessonSummary(lessonCount: number, minutes: number) {
  if (!lessonCount) return null;
  const duration = formatDuration(minutes);
  return `${lessonCount} ${lessonCount === 1 ? 'aula' : 'aulas'}${duration ? ` · ${duration}` : ''}`;
}

/** O botão diz em que ponto ela está: abrir, continuar ou revisar. */
function courseActionLabel(completedCount: number, lessonCount: number) {
  if (completedCount === lessonCount) return 'Revisar curso';
  if (completedCount) return 'Continuar curso';
  return 'Abrir curso';
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
  // O destaque já aparece em cima: repetir na lista mostra o mesmo curso duas vezes.
  const library = catalog.filter((entry) => entry !== featured);
  // Sem o destaque, "Todos os cursos" deixa de ser verdade; um título trocado no admin é mantido.
  const libraryTitle =
    featured && copy.coursesLibraryTitle === SLL_COPY.coursesLibraryTitle
      ? 'Outros cursos'
      : copy.coursesLibraryTitle;

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
                    src={courseCoverSrc(featured.course.id, featured.course.coverStorageKey)}
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
                  {/* Fora da lista agora: o progresso do destaque fica aqui. */}
                  {featured.lessonCount ? (
                    <div className="flex w-full max-w-md flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        {featured.completedCount} de {featured.lessonCount} aulas concluídas
                      </p>
                      <SllProgress
                        label={`Progresso de ${featured.course.title}`}
                        completed={featured.completedCount}
                        total={featured.lessonCount}
                      />
                    </div>
                  ) : null}
                  {/* Igual aos cartões da lista: sem aula publicada, diz que vem aí em vez de
                    sumir com o botão sem explicar. */}
                  {featured.lessonCount ? (
                    <Button asChild className="mt-2 sm:w-auto" variant="default">
                      <Link href={`/sll/cursos/${featured.course.slug}`}>
                        {courseActionLabel(featured.completedCount, featured.lessonCount)}{' '}
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-body text-muted-foreground">Aulas em breve</p>
                  )}
                </div>
              </article>
            </section>
          ) : null}
          {library.length ? (
            <section aria-labelledby="all-courses-title">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="all-courses-title" className="text-body font-semibold text-foreground">
                  {libraryTitle}
                </h2>
                <p className="text-body text-muted-foreground">
                  {library.length} {library.length === 1 ? 'curso' : 'cursos'}
                </p>
              </div>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] items-start gap-4">
                {library.map(({ course, lessonCount, completedCount, minutes }) => (
                  <li className={cn(panelCard, 'gap-3 p-5 sm:p-5')} key={course.id}>
                    {course.coverStorageKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={course.coverAlt ?? ''}
                        className="aspect-video w-full rounded-2xl object-cover"
                        width={1280}
                        height={720}
                        loading="lazy"
                        src={courseCoverSrc(course.id, course.coverStorageKey)}
                      />
                    ) : (
                      <CourseCoverPlaceholder />
                    )}
                    <h3 className="text-headline font-semibold text-balance text-foreground">
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
                      // Na lista, botão claro: o roxo fica só com o curso em destaque.
                      <Button asChild variant="soft">
                        <Link href={`/sll/cursos/${course.slug}`}>
                          {courseActionLabel(completedCount, lessonCount)}{' '}
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
          ) : null}
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

/**
 * Sem arquivo, uma etiqueta pequena (não uma faixa): o título do curso continua sendo o destaque.
 * A proporção 16:9 fica para a capa real.
 */
function CourseCoverPlaceholder() {
  return (
    <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
      <BookOpen aria-hidden="true" className="size-4 shrink-0" />
      <span className="text-sm">Capa em breve</span>
    </div>
  );
}

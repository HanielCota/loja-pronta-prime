import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllProgress } from '@/features/sll/components/sll-progress';
import { ZeCourseShell } from '@/features/ze-mauro/components/course-shell';
import { ZeLessonList } from '@/features/ze-mauro/components/lesson-list';
import { getZeCourse } from '@/features/ze-mauro/server/catalog';
import { zeLessonVideo } from '@/features/ze-mauro/course';

export const metadata: Metadata = { title: 'Curso Zé Mauro' };

export default async function ZeCoursePage() {
  const { session, products, course, completed, hasPri } = await getZeCourse();
  const lessons =
    course?.stages
      .flatMap((stage) => stage.modules.flatMap((module) => module.lessons))
      .filter((item) => item.countsTowardProgress && zeLessonVideo(item.blocks)) ?? [];
  const completedCount = lessons.filter((lesson) => completed.has(lesson.id)).length;
  const next = lessons.find((lesson) => !completed.has(lesson.id));
  return (
    <ZeCourseShell
      account={session.user}
      hasChoice={products.length > 1}
      hasPri={hasPri}
      stages={course?.stages.flatMap((stage) => stage.modules) ?? []}
      product="Curso Zé Mauro"
      title="Seu caminho com o Zé Mauro"
      intro="Siga os módulos e assista às aulas no seu ritmo."
    >
      {course ? (
        <>
          <section className={`${panelCard} gap-4`} aria-label="Seu progresso">
            <p className="text-body text-muted-foreground">
              {completedCount} de {lessons.length} aulas concluídas
            </p>
            <SllProgress
              label="Progresso do curso"
              completed={completedCount}
              total={lessons.length}
            />
            {next ? (
              <Button asChild className="sm:w-fit">
                <Link href={`/ze-mauro/aula/${next.id}`}>
                  {completedCount ? 'Continuar meu curso' : 'Começar meu curso'}
                </Link>
              </Button>
            ) : (
              <p className="text-body text-progress-text">
                Você concluiu todas as aulas disponíveis.
              </p>
            )}
          </section>
          {course.stages.map((stage) => (
            <section
              key={stage.id}
              id={stage.slug}
              className="flex scroll-mt-6 flex-col gap-4"
              aria-labelledby={`heading-${stage.id}`}
            >
              <h2 id={`heading-${stage.id}`} className="text-title font-semibold text-balance">
                {stage.title}
              </h2>
              {stage.modules.map((module) => (
                <section
                  key={module.id}
                  id={module.slug}
                  className={`${panelCard} scroll-mt-6 gap-4`}
                  aria-labelledby={`heading-${module.id}`}
                >
                  <h3 id={`heading-${module.id}`} className="text-body font-semibold">
                    {module.title}
                  </h3>
                  <ZeLessonList lessons={module.lessons} completed={completed} />
                </section>
              ))}
            </section>
          ))}
        </>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            As aulas do Zé Mauro estarão disponíveis em breve.
          </p>
        </section>
      )}
    </ZeCourseShell>
  );
}

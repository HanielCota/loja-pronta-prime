import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllLessonVideo } from '@/features/sll/components/sll-lesson-video';
import { isProgressId } from '@/features/sll/progress-rules';
import { ZeCourseShell } from '@/features/ze-mauro/components/course-shell';
import { ZeLessonList } from '@/features/ze-mauro/components/lesson-list';
import { getZeCourse } from '@/features/ze-mauro/server/catalog';
import { setZeLessonCompletion } from '@/features/ze-mauro/server/actions';
import { zeLessonVideo } from '@/features/ze-mauro/course';

export const metadata: Metadata = { title: 'Aula · Curso Zé Mauro' };

export default async function ZeLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { lessonId } = await params;
  if (!isProgressId(lessonId)) notFound();
  const { session, products, course, completed, hasPri, preview } = await getZeCourse(
    `/ze-mauro/aula/${lessonId}`,
  );
  const modules =
    course?.stages.flatMap((stage) => stage.modules.map((module) => ({ stage, module }))) ?? [];
  const location = modules.find(({ module }) =>
    module.lessons.some((item) => item.id === lessonId),
  );
  const lesson = location?.module.lessons.find((item) => item.id === lessonId);
  if (!course || !lesson || !location) notFound();
  const video = zeLessonVideo(lesson.blocks);
  const available = modules
    .flatMap(({ module }) => module.lessons)
    .filter((item) => zeLessonVideo(item.blocks));
  const index = available.findIndex((item) => item.id === lessonId);
  const previous = index > 0 ? available[index - 1] : undefined;
  const next = index >= 0 ? available[index + 1] : undefined;
  const saved = (await searchParams).resultado === 'saved';
  return (
    <ZeCourseShell
      account={session.user}
      hasChoice={products.length > 1}
      hasPri={hasPri}
      preview={preview}
      stages={modules.map(({ module }) => module)}
      product="Curso Zé Mauro"
      title={lesson.title}
      intro={location.module.title}
      backLink={{ href: `/ze-mauro#${location.module.slug}`, label: 'Voltar às aulas' }}
    >
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className={`${panelCard} min-w-0 gap-5`} aria-label="Conteúdo da aula">
          <SllLessonVideo title={lesson.title} data={video ?? {}} />
          {lesson.description ? (
            <p className="text-body text-pretty text-muted-foreground">{lesson.description}</p>
          ) : null}
          {lesson.blocks
            .filter((block) => block.kind === 'text')
            .map((block) => {
              const text = (block.data as { text?: unknown }).text;
              return typeof text === 'string' ? (
                <p key={block.id} className="text-body whitespace-pre-wrap">
                  {text}
                </p>
              ) : null;
            })}
          {video && !preview ? (
            <form action={setZeLessonCompletion} className="flex flex-col gap-3">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input
                type="hidden"
                name="completed"
                value={completed.has(lesson.id) ? 'false' : 'true'}
              />
              <Button type="submit" variant={completed.has(lesson.id) ? 'soft' : 'default'}>
                {completed.has(lesson.id) ? 'Desfazer conclusão' : 'Marcar como concluída'}
              </Button>
              <output className="text-sm text-muted-foreground">
                {saved ? 'Seu progresso foi salvo. ' : ''}
                {completed.has(lesson.id)
                  ? 'Aula concluída.'
                  : 'Marque quando terminar de assistir.'}
              </output>
            </form>
          ) : null}
          <nav aria-label="Navegar entre aulas" className="flex flex-wrap justify-between gap-3">
            {previous ? (
              <Button asChild variant="ghost" size="inline">
                <Link href={`/ze-mauro/aula/${previous.id}`}>
                  <ArrowLeft aria-hidden="true" />
                  Aula anterior
                </Link>
              </Button>
            ) : null}
            {next ? (
              <Button asChild variant="soft" size="inline">
                <Link href={`/ze-mauro/aula/${next.id}`}>
                  Próxima aula
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </nav>
        </section>
        <section
          className={`${panelCard} min-w-0 gap-4 self-start`}
          aria-label="Aulas deste módulo"
        >
          <h2 className="text-body font-semibold">{location.module.title}</h2>
          <ZeLessonList
            lessons={location.module.lessons}
            completed={completed}
            currentId={lesson.id}
          />
        </section>
      </div>
    </ZeCourseShell>
  );
}

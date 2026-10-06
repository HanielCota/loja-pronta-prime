import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Circle, LockKeyhole } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { SllKnowledgeLibrary } from '@/features/sll/components/sll-knowledge-library';
import { getFirstSllPublishedTrack } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';
import { getSllCopy } from '@/features/sll/server/copy';
import { SllProgress } from '@/features/sll/components/sll-progress';

export const metadata: Metadata = { title: 'Etapa do Método SLL' };

/** Mostra os quatro passos da Etapa 1 e liga cada aula ao visualizador comum. */
export default async function MethodStagePage({
  params,
  searchParams,
}: {
  params: Promise<{ stageId: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [{ stageId }, { q }] = await Promise.all([params, searchParams]);
  const libraryQuery = typeof q === 'string' ? q.slice(0, 200) : '';
  const [{ session, products }, track, copy] = await Promise.all([
    requireProduct('sll'),
    getFirstSllPublishedTrack('method'),
    getSllCopy(),
  ]);
  const stage = track?.stages.find((item) => item.id === stageId);
  if (!track || !stage) notFound();
  const unlocked = stage.access?.isUnlocked ?? false;
  const lessonsById = new Map(
    track.stages
      .flatMap((item) => item.modules.flatMap((module) => module.lessons))
      .map((lesson) => [lesson.id, lesson]),
  );

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={stage.title}
      intro={stage.description ?? undefined}
      backLink={{ href: '/sll/metodo', label: 'Voltar ao Método SLL' }}
    >
      {!unlocked ? (
        <section className={panelCard}>
          <LockKeyhole aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="mt-3 text-body text-foreground">
            {stage.access?.lockMessage ?? 'Conclua a etapa anterior para abrir esta etapa.'}
          </p>
        </section>
      ) : (
        <section aria-label="Passos da etapa" className="flex flex-col gap-4">
          <div className={panelCard}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-body font-semibold text-foreground">{copy.stageProgressTitle}</h2>
              <p className="text-body text-foreground">
                {stage.access?.completedCount ?? 0} de {stage.access?.totalCount ?? 0} ações
                concluídas
              </p>
            </div>
            <div className="mt-4">
              <SllProgress
                label={copy.stageProgressTitle}
                completed={stage.access?.completedCount ?? 0}
                total={stage.access?.totalCount ?? 0}
              />
            </div>
          </div>
          {stage.slug === 'etapa-3' ? (
            <SllKnowledgeLibrary
              key={libraryQuery}
              initialQuery={libraryQuery}
              modules={stage.modules.map((module) => ({
                id: module.id,
                title: module.title,
                lessons: module.lessons.map((lesson) => ({
                  id: lesson.id,
                  title: lesson.title,
                  description: lesson.description,
                  completed: Boolean(lesson.completedAt),
                })),
              }))}
            />
          ) : stage.slug === 'etapa-2' ? (
            <>
              <section aria-labelledby="priorities-heading" className="flex flex-col gap-3">
                <h2 id="priorities-heading" className="text-title font-semibold text-foreground">
                  {copy.stage2PrioritiesTitle}
                </h2>
                <p className="text-body text-muted-foreground">{copy.stage2PrioritiesIntro}</p>
                {stage.modules
                  .filter((module) => module.slug !== 'acoes-complementares')
                  .map((module) => {
                    const lesson = module.lessons[0];
                    return (
                      <details className={`${panelCard} group`} key={module.id}>
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                          {lesson?.completedAt ? (
                            <Check aria-hidden="true" className="size-5 text-progress-text" />
                          ) : (
                            <Circle aria-hidden="true" className="size-5 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1">{module.title}</span>
                          <ChevronDown
                            aria-hidden="true"
                            className="size-5 shrink-0 text-link group-open:rotate-180 motion-safe:transition-transform"
                          />
                        </summary>
                        {lesson ? (
                          <div className="mt-4 border-t border-border pt-4">
                            <h3 className="text-body font-semibold text-foreground">
                              {lesson.title}
                            </h3>
                            {lesson.description ? (
                              <p className="mt-2 text-body whitespace-pre-line text-foreground">
                                {lesson.description}
                              </p>
                            ) : null}
                            {lesson.relatedLessonId && lessonsById.get(lesson.relatedLessonId) ? (
                              <Link
                                className="mt-3 inline-flex min-h-11 items-center text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                href={`/sll/aula/${lesson.relatedLessonId}`}
                              >
                                Abrir aula completa:{' '}
                                {lessonsById.get(lesson.relatedLessonId)!.title}
                              </Link>
                            ) : null}
                            <Button asChild className="mt-4" variant="soft">
                              <Link href={`/sll/aula/${lesson.id}`}>
                                {lesson.completedAt ? 'Revisar prioridade' : 'Abrir prioridade'}
                                <ArrowRight aria-hidden="true" />
                              </Link>
                            </Button>
                          </div>
                        ) : null}
                      </details>
                    );
                  })}
              </section>

              {stage.modules
                .filter((module) => module.slug === 'acoes-complementares')
                .map((module) => (
                  <section className={panelCard} key={module.id} aria-labelledby="optional-heading">
                    <h2 id="optional-heading" className="text-title font-semibold text-foreground">
                      {copy.stage2OptionalTitle}
                    </h2>
                    <p className="mt-2 text-body text-muted-foreground">
                      {copy.stage2OptionalIntro}
                    </p>
                    <ol className="mt-4 flex flex-col divide-y divide-border border-t border-border">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <div className="flex flex-col gap-1 py-2">
                            <Link
                              className="flex min-h-14 items-center gap-3 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                              href={`/sll/aula/${lesson.id}`}
                            >
                              <span className="min-w-0 flex-1">{lesson.title}</span>
                              <ArrowRight aria-hidden="true" className="size-5 text-link" />
                            </Link>
                            {lesson.relatedLessonId && lessonsById.get(lesson.relatedLessonId) ? (
                              <Link
                                className="inline-flex min-h-11 items-center text-body text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                href={`/sll/aula/${lesson.relatedLessonId}`}
                              >
                                Abrir aula completa:{' '}
                                {lessonsById.get(lesson.relatedLessonId)!.title}
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
            </>
          ) : (
            stage.modules.map((module, moduleIndex) => {
              const completedCount = module.lessons.filter((lesson) => lesson.completedAt).length;
              return (
                <details
                  className={`${panelCard} group`}
                  key={module.id}
                  open={module.lessons.some((lesson) => lesson.id === track.resumeLessonId)}
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {module.lessons.length > 0 && completedCount === module.lessons.length ? (
                        <Check aria-hidden="true" className="size-5 shrink-0 text-progress-text" />
                      ) : (
                        <Circle
                          aria-hidden="true"
                          className="size-5 shrink-0 text-muted-foreground"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-link">PASSO {moduleIndex + 1}</p>
                        <h2 className="text-body font-semibold text-balance text-foreground">
                          {module.title}
                        </h2>
                      </div>
                    </div>
                    <span className="ml-auto shrink-0 text-sm text-muted-foreground">
                      {completedCount} / {module.lessons.length}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-link group-open:rotate-180 motion-safe:transition-transform"
                    />
                  </summary>
                  <div className="mt-4">
                    <SllProgress
                      label={`Progresso do passo ${moduleIndex + 1}`}
                      completed={completedCount}
                      total={module.lessons.length}
                    />
                  </div>
                  <ol className="mt-4 flex flex-col divide-y divide-border border-t border-border">
                    {module.lessons.map((lesson, index) => (
                      <li key={lesson.id}>
                        <Link
                          className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                          href={`/sll/aula/${lesson.id}`}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-sm text-muted-foreground">
                            <span className="sr-only">Aula </span>
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">{lesson.title}</span>
                          {lesson.completedAt ? (
                            <Check aria-label="Concluída" className="size-5 text-progress-text" />
                          ) : (
                            <ArrowRight aria-hidden="true" className="size-5 text-link" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ol>
                  {module.lessons.length > 0 ? (
                    <p className="mt-3 text-body text-muted-foreground">
                      {completedCount} de {module.lessons.length} aulas concluídas
                    </p>
                  ) : (
                    <p className="mt-3 text-body text-muted-foreground">
                      As aulas deste passo ainda não foram publicadas.
                    </p>
                  )}
                </details>
              );
            })
          )}
        </section>
      )}
    </SllAreaShell>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, ChevronDown, Circle, LockKeyhole } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { SllKnowledgeLibrary } from '@/features/sll/components/sll-knowledge-library';
import { getSllMethodTrackForStage } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';
import { getSllCopy } from '@/features/sll/server/copy';
import { SllProgress } from '@/features/sll/components/sll-progress';
import { SllStage2Pilot } from '@/features/sll/components/sll-stage2-pilot';
import { getSllStageCardState } from '@/features/sll/stage-card-state';
import { sllLessonHref } from '@/features/sll/lesson-navigation';
import { getSllPlanIntake } from '@/features/sll/server/plan';
import { libraryMaterialLabel } from '@/features/sll/material-format';
import { splitPlanModules } from '@/features/sll/plan-modules';

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
    getSllMethodTrackForStage(stageId),
    getSllCopy(),
  ]);
  const stage = track?.stages.find((item) => item.id === stageId);
  if (!track || !stage) notFound();
  const completedCount = stage.access?.completedCount ?? 0;
  const totalCount = stage.access?.totalCount ?? 0;
  const publishedLessonCount = stage.modules.reduce(
    (count, module) => count + module.lessons.length,
    0,
  );
  const stageState = getSllStageCardState({
    completedCount,
    totalCount,
    publishedLessonCount,
    isComplete: stage.access?.isComplete ?? false,
    isUnlocked: stage.access?.isUnlocked ?? false,
    lockMessage: stage.access?.lockMessage ?? null,
  });
  const lessonsById = new Map(
    track.stages
      .flatMap((item) => item.modules.flatMap((module) => module.lessons))
      .map((lesson) => [lesson.id, { id: lesson.id, title: lesson.title }]),
  );
  const planIntake = stage.slug === 'etapa-2' ? await getSllPlanIntake(session.user.id) : null;
  const { requiredModules, optionalLessons } = splitPlanModules(
    stage.modules.map((module) => ({
      id: module.id,
      slug: module.slug,
      title: module.title,
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        countsTowardProgress: lesson.countsTowardProgress,
        completed: Boolean(lesson.completedAt),
        relatedLesson: lesson.relatedLessonId
          ? (lessonsById.get(lesson.relatedLessonId) ?? null)
          : null,
      })),
    })),
  );
  const optionalModule = stage.modules.find((module) => module.slug === 'acoes-complementares');
  const optionalPlanModule =
    optionalLessons.length > 0
      ? {
          title: optionalModule?.title ?? 'Ações complementares',
          lessons: optionalLessons,
        }
      : null;

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={stage.title}
      intro={stage.description ?? undefined}
      backLink={{ href: '/sll/metodo', label: 'Voltar ao Método SLL' }}
    >
      {stageState.kind === 'preparing' ? (
        <section className={panelCard}>
          <BookOpen aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="mt-3 text-body text-pretty text-foreground">{stageState.message}</p>
        </section>
      ) : stageState.kind === 'locked' ? (
        <section className={panelCard}>
          <LockKeyhole aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="mt-3 text-body text-pretty text-foreground">{stageState.message}</p>
        </section>
      ) : (
        <section aria-label="Passos da etapa" className="flex flex-col gap-4">
          <div className={panelCard}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-body font-semibold text-foreground">{copy.stageProgressTitle}</h2>
              {stageState.showProgress ? (
                <p className="text-body text-foreground">{stageState.message}</p>
              ) : null}
            </div>
            {stageState.showProgress ? (
              <div className="mt-4">
                <SllProgress
                  label={copy.stageProgressTitle}
                  completed={completedCount}
                  total={totalCount}
                />
              </div>
            ) : (
              <p className="mt-3 text-body text-pretty text-muted-foreground">
                {stageState.message}
              </p>
            )}
          </div>
          {stage.slug === 'etapa-3' ? (
            <SllKnowledgeLibrary
              key={libraryQuery}
              initialQuery={libraryQuery}
              stageId={stage.id}
              modules={stage.modules.map((module) => ({
                id: module.id,
                title: module.title,
                lessons: module.lessons.map((lesson) => ({
                  id: lesson.id,
                  title: lesson.title,
                  description: lesson.description,
                  durationMinutes: lesson.durationMinutes,
                  materialLabel: libraryMaterialLabel(lesson.blocks),
                  completed: Boolean(lesson.completedAt),
                })),
              }))}
            />
          ) : stage.slug === 'etapa-2' ? (
            <>
              <section className={panelCard} aria-labelledby="personal-plan-title">
                <h2 id="personal-plan-title" className="text-title font-semibold">
                  Seu plano de ação
                </h2>
                <p className="text-body text-muted-foreground">
                  Escolha um roteiro para uma loja nova ou acompanhe os dados de uma loja com
                  histórico. As ações do plano e as aulas guardam seu progresso separadamente.
                </p>
                {/* Com o plano de 7 dias logo abaixo, o roxo fica com o dia da vez. */}
                <Button asChild variant={planIntake ? 'soft' : 'default'}>
                  <Link href="/sll/plano">Abrir meu plano</Link>
                </Button>
              </section>
              {planIntake ? (
                <SllStage2Pilot
                  trackId={track.id}
                  requiredModules={requiredModules}
                  optionalModule={optionalPlanModule}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  resumeLessonId={track.resumeLessonId}
                  returnHref={`/sll/metodo/etapa/${stage.id}`}
                />
              ) : null}
            </>
          ) : (
            stage.modules.map((module, moduleIndex) => {
              const requiredLessons = module.lessons.filter(
                (lesson) => lesson.countsTowardProgress,
              );
              const moduleCompletedCount = requiredLessons.filter(
                (lesson) => lesson.completedAt,
              ).length;
              const isModuleComplete =
                requiredLessons.length > 0 && moduleCompletedCount === requiredLessons.length;
              const nextModule = stage.modules[moduleIndex + 1];
              const firstLessonOfNextModule = nextModule?.lessons.find(
                (lesson) => lesson.countsTowardProgress,
              );
              return (
                <details
                  className={`${panelCard} group`}
                  key={module.id}
                  open={
                    module.lessons.some((lesson) => lesson.id === track.resumeLessonId) ||
                    (moduleIndex === 0 && track.resumeLessonId === null)
                  }
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {isModuleComplete ? (
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
                      {moduleCompletedCount} / {requiredLessons.length}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-link group-open:rotate-180 motion-safe:transition-transform"
                    />
                  </summary>
                  <div className="mt-4">
                    <SllProgress
                      label={`Progresso do passo ${moduleIndex + 1}`}
                      completed={moduleCompletedCount}
                      total={requiredLessons.length}
                    />
                  </div>
                  <ol className="mt-4 flex flex-col divide-y divide-border border-t border-border">
                    {module.lessons.map((lesson, index) => (
                      <li key={lesson.id}>
                        <Link
                          className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                          href={sllLessonHref('method', lesson.id)}
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
                  {requiredLessons.length > 0 ? (
                    <p className="mt-3 text-body text-muted-foreground">
                      {moduleCompletedCount} de {requiredLessons.length} aulas concluídas
                    </p>
                  ) : (
                    <p className="mt-3 text-body text-muted-foreground">
                      As aulas deste passo ainda não foram publicadas.
                    </p>
                  )}
                  {isModuleComplete && firstLessonOfNextModule ? (
                    <Button asChild className="mt-4" variant="soft">
                      <Link href={sllLessonHref('method', firstLessonOfNextModule.id)}>
                        Próximo passo <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </details>
              );
            })
          )}
        </section>
      )}
    </SllAreaShell>
  );
}

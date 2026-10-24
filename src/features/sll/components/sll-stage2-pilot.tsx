'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Circle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import { sllLessonHref } from '../lesson-navigation';
import { setSllLessonCompletionForm, type SllProgressActionResult } from '../server/actions';

const INITIAL_STATE: SllProgressActionResult = { saved: false, message: '' };

export type SllStage2PlanLesson = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  relatedLesson: { id: string; title: string } | null;
};

export type SllStage2PlanModule = {
  id: string;
  title: string;
  lessons: SllStage2PlanLesson[];
};

type SllStage2PilotProps = {
  trackId: string;
  requiredModules: SllStage2PlanModule[];
  optionalModule: { title: string; lessons: SllStage2PlanLesson[] } | null;
  completedCount: number;
  totalCount: number;
  resumeLessonId: string | null;
  returnHref: string;
};

/**
 * O piloto da Etapa 8 virou o plano completo sem trocar a moldura: cada ação continua sendo uma
 * aula publicada, e a conclusão usa a mesma ação protegida no servidor do visualizador.
 */
export function SllStage2Pilot({
  trackId,
  requiredModules,
  optionalModule,
  completedCount,
  totalCount,
  resumeLessonId,
  returnHref,
}: SllStage2PilotProps) {
  const completeRequiredDays = requiredModules.filter(
    (module) => module.lessons.length > 0 && module.lessons.every((lesson) => lesson.completed),
  ).length;
  // Só o dia da vez tem o botão roxo: os outros abertos ficam claros, pra não competir.
  const currentDayIndex = requiredModules.findIndex(
    (module) => !module.lessons.length || !module.lessons.every((lesson) => lesson.completed),
  );

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="stage2-plan-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-link">Plano de 7 dias</p>
            <h2 id="stage2-plan-title" className="text-title font-semibold text-foreground">
              Comece pelo primeiro dia
            </h2>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {completedCount} de {totalCount} ações obrigatórias concluídas
          </p>
        </div>

        <p className="text-body text-pretty text-muted-foreground">
          Faça as ações em ordem. Seu progresso fica salvo para continuar no seu ritmo.
        </p>

        <div className="flex flex-col gap-3">
          {requiredModules.map((module, index) => (
            <PlanModule
              key={module.id}
              index={index}
              total={requiredModules.length}
              isCurrent={index === currentDayIndex}
              module={module}
              trackId={trackId}
              resumeLessonId={resumeLessonId}
              returnHref={returnHref}
              nextModule={requiredModules[index + 1] ?? null}
            />
          ))}
        </div>

        <p className="text-body text-muted-foreground">
          {completeRequiredDays} de {requiredModules.length} dias concluídos. O progresso do plano
          considera apenas as {totalCount} ações obrigatórias.
        </p>
      </section>

      {optionalModule ? (
        <section className={panelCard} aria-labelledby="optional-heading">
          <h2 id="optional-heading" className="text-title font-semibold text-foreground">
            {optionalModule.title}
          </h2>
          <p className="mt-2 text-body text-muted-foreground">
            Faça estas ações quando fizer sentido para sua loja. Elas são opcionais e não impedem a
            conclusão do plano principal.
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {optionalModule.lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <details className="group rounded-2xl border border-border p-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {lesson.completed ? (
                      <Check aria-hidden="true" className="size-5 shrink-0 text-progress-text" />
                    ) : (
                      <Circle
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="sr-only">Ação complementar {index + 1}: </span>
                      {lesson.title}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-link group-open:rotate-180 motion-safe:transition-transform"
                    />
                  </summary>
                  <PlanLessonContent
                    lesson={lesson}
                    trackId={trackId}
                    returnHref={returnHref}
                    optional
                  />
                </details>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function PlanModule({
  index,
  total,
  isCurrent,
  module,
  trackId,
  resumeLessonId,
  returnHref,
  nextModule,
}: {
  index: number;
  total: number;
  isCurrent: boolean;
  module: SllStage2PlanModule;
  trackId: string;
  resumeLessonId: string | null;
  returnHref: string;
  nextModule: SllStage2PlanModule | null;
}) {
  const open =
    module.lessons.some((lesson) => lesson.id === resumeLessonId) ||
    (resumeLessonId === null && index === 0);
  const [isOpen, setIsOpen] = useState(open);
  const completed = module.lessons.length > 0 && module.lessons.every((lesson) => lesson.completed);
  const dayTitle = module.title.replace(/^Dia \d+ · /, '');

  return (
    <details
      className={cn(panelCard, 'group')}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {completed ? (
          <Check aria-hidden="true" className="size-5 shrink-0 text-progress-text" />
        ) : (
          <Circle aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1">
          Dia {index + 1} · {dayTitle}
        </span>
        <span className="shrink-0 text-sm font-normal text-muted-foreground">
          {completed ? 'Concluído' : `Dia ${index + 1} de ${total}`}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-link group-open:rotate-180 motion-safe:transition-transform"
        />
      </summary>

      {module.lessons.length > 0 ? (
        module.lessons.map((lesson) => (
          <PlanLessonContent
            key={lesson.id}
            lesson={lesson}
            trackId={trackId}
            returnHref={returnHref}
            nextModule={
              module.lessons.every((item) => item.completed || item.id === lesson.id)
                ? nextModule
                : null
            }
            wholeDay={module.lessons.length === 1}
            emphasized={isCurrent}
          />
        ))
      ) : (
        <p className="mt-4 border-t border-border pt-4 text-body text-muted-foreground">
          Esta ação ainda não foi publicada.
        </p>
      )}
    </details>
  );
}

function PlanLessonContent({
  lesson,
  trackId,
  returnHref,
  nextModule,
  optional = false,
  wholeDay = true,
  emphasized = false,
}: {
  lesson: SllStage2PlanLesson;
  trackId: string;
  returnHref: string;
  nextModule?: SllStage2PlanModule | null;
  optional?: boolean;
  wholeDay?: boolean;
  /** O dia da vez: o único botão roxo do plano. */
  emphasized?: boolean;
}) {
  const [state, action, isPending] = useActionState(setSllLessonCompletionForm, INITIAL_STATE);
  const completed = state.completed ?? lesson.completed;
  const nextLesson = nextModule?.lessons.find((item) => !item.completed) ?? nextModule?.lessons[0];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-sm font-semibold text-muted-foreground">
        {optional ? 'Ação complementar' : 'Ação principal'}
      </p>
      <h3 className="mt-1 text-headline font-semibold text-balance text-foreground">
        {lesson.title}
      </h3>
      {lesson.description ? (
        <p className="mt-3 text-body whitespace-pre-line text-foreground">{lesson.description}</p>
      ) : null}

      {lesson.relatedLesson ? (
        <Link
          className="mt-3 inline-flex min-h-11 items-center text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={sllLessonHref('method', lesson.relatedLesson.id, returnHref)}
        >
          Abrir aula completa: {lesson.relatedLesson.title}
        </Link>
      ) : null}

      <form action={action} className="mt-5 flex flex-col gap-4">
        <input name="trackId" type="hidden" value={trackId} />
        <input name="lessonId" type="hidden" value={lesson.id} />
        <input name="completed" type="hidden" value={completed ? 'false' : 'true'} />
        <Button
          loading={isPending}
          loadingText="Salvando…"
          variant={!completed && emphasized ? 'default' : 'soft'}
        >
          {completed ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}
          {completed
            ? optional || !wholeDay
              ? 'Desmarcar ação concluída'
              : 'Desmarcar como concluída'
            : optional || !wholeDay
              ? 'Marcar ação como concluída'
              : 'Marcar este dia como concluído'}
        </Button>
      </form>

      {completed && nextLesson ? (
        <div className="mt-4 rounded-2xl bg-muted p-4">
          <p className="text-body text-pretty text-foreground">
            Próximo caminho: {nextModule?.title}.
          </p>
          <Button asChild className="mt-3" size="inline" variant="soft">
            <Link href={sllLessonHref('method', nextLesson.id, returnHref)}>
              Abrir próximo dia <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}

      <LiveRegion>{state.message}</LiveRegion>
      {state.message ? (
        <p
          className={
            state.saved ? 'mt-3 text-body text-progress-text' : 'mt-3 text-body text-destructive'
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CircleCheck, CirclePlay, LockKeyhole, Wrench } from 'lucide-react';
import { SllGroupedList, SllListRow } from '@/features/sll/components/sll-grouped-list';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getFirstSllPublishedTrack } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';
import { getSllCopy } from '@/features/sll/server/copy';
import { SllProgress } from '@/features/sll/components/sll-progress';
import { getSllStageCardState } from '@/features/sll/stage-card-state';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Método SLL' };

/** Resumo das três etapas, com avanço em sequência conforme o progresso salvo. */
export default async function MethodPage() {
  const [{ session, products }, track, copy] = await Promise.all([
    requireProduct('sll'),
    getFirstSllPublishedTrack('method'),
    getSllCopy(),
  ]);

  // A etapa que trava as outras é a primeira ainda pendente (a mesma regra do progresso), não
  // sempre a anterior: sem nada feito, a Etapa 3 também espera a Etapa 1.
  const blockingIndex =
    track?.stages.findIndex(
      (stage) => (stage.access?.totalCount ?? 0) > 0 && !stage.access?.isComplete,
    ) ?? -1;

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={track?.title ?? 'Método SLL'}
      intro={
        track?.description ?? 'Sistema Loja Lucrativa — em 3 etapas sua loja no ar e vendendo.'
      }
    >
      {track && track.stages.length ? (
        <div className="flex flex-col gap-4">
          <section aria-labelledby="method-stages-title">
            <h2 id="method-stages-title" className="mb-3 text-body font-semibold text-foreground">
              {copy.methodStagesTitle}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-4">
              {track.stages.map((stage, index) => {
                const completedCount = stage.access?.completedCount ?? 0;
                const totalCount = stage.access?.totalCount ?? 0;
                const publishedLessonCount = stage.modules.reduce(
                  (count, module) => count + module.lessons.length,
                  0,
                );
                const state = getSllStageCardState({
                  completedCount,
                  totalCount,
                  publishedLessonCount,
                  isComplete: stage.access?.isComplete ?? false,
                  isUnlocked: stage.access?.isUnlocked ?? false,
                  lockMessage: stage.access?.lockMessage ?? null,
                });
                const locked = state.kind === 'locked';
                return (
                  <article className={cn(panelCard, 'gap-3 p-6 sm:p-6')} key={stage.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          'text-sm font-semibold tracking-wide',
                          locked ? 'text-muted-foreground' : 'text-link',
                        )}
                      >
                        ETAPA {index + 1}
                      </p>
                      {state.kind === 'complete' ? (
                        <CircleCheck aria-hidden="true" className="size-6 text-progress-text" />
                      ) : state.kind === 'available' ? (
                        <CirclePlay aria-hidden="true" className="size-6 text-link" />
                      ) : state.kind === 'locked' ? (
                        <LockKeyhole aria-hidden="true" className="size-6 text-muted-foreground" />
                      ) : (
                        <BookOpen aria-hidden="true" className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-headline font-semibold text-balance text-foreground">
                      {stage.title}
                    </h3>
                    {stage.description ? (
                      <p className="text-body text-pretty text-muted-foreground">
                        {stage.description}
                      </p>
                    ) : null}
                    {locked ? (
                      // Bloqueada: uma linha curta com o cadeado, em vez da frase longa repetindo
                      // o nome das duas etapas.
                      <p className="mt-1 flex items-center gap-2 text-body text-muted-foreground">
                        <LockKeyhole aria-hidden="true" className="size-4 shrink-0" />
                        {blockingIndex >= 0 && blockingIndex < index
                          ? `Abre depois da Etapa ${blockingIndex + 1}`
                          : state.message}
                      </p>
                    ) : (
                      <p className="text-body text-pretty text-muted-foreground">{state.message}</p>
                    )}
                    {state.showProgress ? (
                      <SllProgress
                        label={`Progresso da Etapa ${index + 1}`}
                        completed={completedCount}
                        total={totalCount}
                      />
                    ) : null}
                    {state.actionLabel ? (
                      // Roxo cheio só na etapa em andamento: é a ação principal da tela.
                      <Button
                        asChild
                        className="mt-1"
                        variant={state.kind === 'available' ? 'default' : 'soft'}
                      >
                        <Link href={`/sll/metodo/etapa/${stage.id}`}>
                          {state.actionLabel}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
          {/* Ferramentas fora da grade das etapas: é um atalho, não uma quarta etapa. */}
          <SllGroupedList>
            <SllListRow
              icon={<Wrench />}
              title={copy.methodToolsTitle}
              detail={copy.methodToolsDetail}
              href="/sll/recursos"
            />
          </SllGroupedList>
        </div>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-pretty text-muted-foreground">
            O Método ainda está em preparação. As etapas aparecerão aqui quando forem publicadas.
          </p>
        </section>
      )}
    </SllAreaShell>
  );
}

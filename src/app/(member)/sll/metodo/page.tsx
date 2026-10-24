import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CircleCheck, CirclePlay, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllPage } from '@/features/sll/sll-area-shell';
import { getFirstSllPublishedTrack } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';
import { getSllCopy } from '@/features/sll/server/copy';
import { SllProgress } from '@/features/sll/components/sll-progress';
import { getSllStageCardState } from '@/features/sll/stage-card-state';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Método SLL' };

/** Resumo das três etapas, com avanço em sequência conforme o progresso salvo. */
export default async function MethodPage() {
  const [{ products }, track, copy] = await Promise.all([
    requireProduct('sll'),
    getFirstSllPublishedTrack('method'),
    getSllCopy(),
  ]);

  return (
    <SllPage
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
                return (
                  <article className={cn(panelCard, 'gap-3 p-5 sm:p-5')} key={stage.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-link">ETAPA {index + 1}</p>
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
                    <h3 className="text-xl leading-snug font-semibold text-balance text-foreground">
                      {stage.title}
                    </h3>
                    {stage.description ? (
                      <p className="text-body text-pretty text-muted-foreground">
                        {stage.description}
                      </p>
                    ) : null}
                    <p className="text-body text-pretty text-muted-foreground">{state.message}</p>
                    {state.showProgress ? (
                      <SllProgress
                        label={`Progresso da Etapa ${index + 1}`}
                        completed={completedCount}
                        total={totalCount}
                      />
                    ) : null}
                    {state.actionLabel ? (
                      <Button asChild variant="soft">
                        <Link href={`/sll/metodo/etapa/${stage.id}`}>
                          {state.actionLabel}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
                  </article>
                );
              })}
              <section
                className={cn(panelCard, 'gap-3 p-5 sm:p-5')}
                aria-labelledby="method-tools-title"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-link">FERRAMENTAS</p>
                  <BookOpen aria-hidden="true" className="size-6 text-link" />
                </div>
                <h3
                  id="method-tools-title"
                  className="text-xl leading-snug font-semibold text-foreground"
                >
                  {copy.methodToolsTitle}
                </h3>
                <p className="text-body text-pretty text-muted-foreground">
                  {copy.methodToolsDetail}
                </p>
                <Button asChild className="w-full" variant="soft">
                  <Link href="/sll/recursos">{copy.methodToolsButton}</Link>
                </Button>
              </section>
            </div>
          </section>
        </div>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-pretty text-muted-foreground">
            O Método ainda está em preparação. As etapas aparecerão aqui quando forem publicadas.
          </p>
        </section>
      )}
    </SllPage>
  );
}

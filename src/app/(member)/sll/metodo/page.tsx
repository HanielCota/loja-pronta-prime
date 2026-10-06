import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CircleCheck, CirclePlay, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { getFirstSllPublishedTrack } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Método SLL' };

/** Resumo das três etapas, com avanço em sequência conforme o progresso salvo. */
export default async function MethodPage() {
  const [{ session, products }, track] = await Promise.all([
    requireProduct('sll'),
    getFirstSllPublishedTrack('method'),
  ]);

  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="sll"
      title={track?.title ?? 'Método SLL'}
      intro={
        track?.description ?? 'Sistema Loja Lucrativa — em 3 etapas sua loja no ar e vendendo.'
      }
    >
      {track && track.stages.length ? (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="method-stages-title">
            <h2 id="method-stages-title" className="mb-4 text-title font-semibold text-foreground">
              Etapas
            </h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {track.stages.map((stage, index) => {
                const completedCount = stage.access?.completedCount ?? 0;
                const totalCount = stage.access?.totalCount ?? 0;
                const unlocked = stage.access?.isUnlocked ?? false;
                return (
                  <article className={panelCard} key={stage.id}>
                    <div className="flex items-center gap-3">
                      {stage.access?.isComplete ? (
                        <CircleCheck aria-hidden="true" className="size-6 text-progress-text" />
                      ) : unlocked ? (
                        <CirclePlay aria-hidden="true" className="size-6 text-link" />
                      ) : (
                        <LockKeyhole aria-hidden="true" className="size-6 text-muted-foreground" />
                      )}
                      <p className="text-body font-semibold text-foreground">Etapa {index + 1}</p>
                    </div>
                    <h3 className="mt-4 text-title font-semibold text-foreground">{stage.title}</h3>
                    <p className="mt-2 text-body text-muted-foreground">
                      {unlocked
                        ? `${completedCount} de ${totalCount} ações concluídas`
                        : (stage.access?.lockMessage ??
                          'Conclua a etapa anterior para abrir esta etapa.')}
                    </p>
                    <div
                      className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-progress"
                        style={{
                          width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    {unlocked ? (
                      <Button
                        asChild
                        className="mt-5"
                        variant={completedCount ? 'soft' : 'default'}
                      >
                        <Link href={`/sll/metodo/etapa/${stage.id}`}>
                          {completedCount ? 'Revisar etapa' : 'Começar etapa'}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className={panelCard} aria-labelledby="method-tools-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <BookOpen aria-hidden="true" className="mt-1 size-5 text-link" />
                <div>
                  <h2 id="method-tools-title" className="text-body font-semibold text-foreground">
                    Ferramentas
                  </h2>
                  <p className="mt-1 text-body text-muted-foreground">
                    Materiais e ferramentas do SLL.
                  </p>
                </div>
              </div>
              <Button asChild variant="soft">
                <Link href="/sll/recursos">Acessar ferramentas</Link>
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            O conteúdo do método ainda não está disponível.
          </p>
        </section>
      )}
    </AreaShell>
  );
}

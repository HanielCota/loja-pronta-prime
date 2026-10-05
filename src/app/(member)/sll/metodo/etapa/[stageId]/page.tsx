import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Circle, LockKeyhole } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { SllKnowledgeLibrary } from '@/features/sll/components/sll-knowledge-library';
import { getFirstSllPublishedTrack } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Etapa do Método SLL' };

const RELATED_LESSON_SLUG: Record<string, string> = {
  'dia-2-titulos-e-descricoes': 'titulos-descricao-precificacao',
  'dia-3-fotos-de-capa': 'anuncios-automaticos-fotos',
  'dia-4-oferta': 'desconto',
  'dia-5-atendimento-e-pedidos': 'como-gerar-etiqueta',
  'dia-6-revisao-da-semana': 'informacoes-gerenciais',
  'cupom-de-novo-seguidor': 'cupons',
  'videos-curtos-shopee-videos': 'videos-shopee-videos',
  'oferta-relampago': 'oferta-relampago-da-loja',
  'duplicar-anuncios': 'duplicando-anuncios-do-jeito-certo',
  'gerar-etiqueta-antes-do-primeiro-pedido': 'como-gerar-etiqueta',
  'responder-chat-em-12-horas': 'chat-de-ouro-avaliacoes-reputacao',
  'primeiras-avaliacoes': 'primeiras-avaliacoes',
};

/** Mostra os quatro passos da Etapa 1 e liga cada aula ao visualizador comum. */
export default async function MethodStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const [{ session, products }, track] = await Promise.all([
    requireProduct('sll'),
    getFirstSllPublishedTrack('method'),
  ]);
  const stage = track?.stages.find((item) => item.id === stageId);
  if (!track || !stage) notFound();
  const unlocked = stage.access?.isUnlocked ?? false;
  const lessonsBySlug = new Map(
    track.stages
      .flatMap((item) => item.modules.flatMap((module) => module.lessons))
      .map((lesson) => [lesson.slug, lesson]),
  );

  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="sll"
      title={stage.title}
    >
      <Button asChild className="w-fit" variant="ghost" size="inline">
        <Link href="/sll/metodo">
          <ArrowLeft aria-hidden="true" />
          Voltar ao Método SLL
        </Link>
      </Button>
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
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-body font-semibold text-foreground">Progresso da etapa</h2>
              <p className="text-body text-foreground">
                {stage.access?.completedCount ?? 0} / {stage.access?.totalCount ?? 0} concluídas
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-progress"
                style={{
                  width: `${stage.access?.totalCount ? (stage.access.completedCount / stage.access.totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          {stage.slug === 'etapa-3' ? (
            <SllKnowledgeLibrary
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
                  Seis prioridades
                </h2>
                <p className="text-body text-muted-foreground">
                  Uma prioridade por dia. Todos os dias estão disponíveis; avance no seu ritmo.
                </p>
                {stage.modules
                  .filter((module) => module.slug !== 'acoes-complementares')
                  .map((module) => {
                    const lesson = module.lessons[0];
                    return (
                      <details className={panelCard} key={module.id}>
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                          {lesson?.completedAt ? (
                            <Check aria-hidden="true" className="size-5 text-progress-text" />
                          ) : (
                            <Circle aria-hidden="true" className="size-5 text-muted-foreground" />
                          )}
                          <span>{module.title}</span>
                          <ArrowRight aria-hidden="true" className="ml-auto size-5 text-link" />
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
                            {RELATED_LESSON_SLUG[module.slug ?? ''] &&
                            lessonsBySlug.get(RELATED_LESSON_SLUG[module.slug ?? ''] ?? '') ? (
                              <Link
                                className="mt-3 inline-flex min-h-11 items-center text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                href={`/sll/aula/${lessonsBySlug.get(RELATED_LESSON_SLUG[module.slug ?? ''] ?? '')!.id}`}
                              >
                                Abrir aula completa:{' '}
                                {
                                  lessonsBySlug.get(RELATED_LESSON_SLUG[module.slug ?? ''] ?? '')!
                                    .title
                                }
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
                      Ações complementares
                    </h2>
                    <p className="mt-2 text-body text-muted-foreground">
                      Aprofunde o que fizer sentido para sua loja. Estas ações não entram na
                      contagem das 6 prioridades.
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
                            {RELATED_LESSON_SLUG[lesson.slug ?? ''] &&
                            lessonsBySlug.get(RELATED_LESSON_SLUG[lesson.slug ?? ''] ?? '') ? (
                              <Link
                                className="inline-flex min-h-11 items-center text-body text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                href={`/sll/aula/${lessonsBySlug.get(RELATED_LESSON_SLUG[lesson.slug ?? ''] ?? '')!.id}`}
                              >
                                Abrir aula completa:{' '}
                                {
                                  lessonsBySlug.get(RELATED_LESSON_SLUG[lesson.slug ?? ''] ?? '')!
                                    .title
                                }
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
                <article className={panelCard} key={module.id}>
                  <div className="flex items-center gap-3">
                    {module.lessons.length > 0 && completedCount === module.lessons.length ? (
                      <Check aria-hidden="true" className="size-5 text-progress-text" />
                    ) : (
                      <Circle aria-hidden="true" className="size-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-link">PASSO {moduleIndex + 1}</p>
                      <h2 className="text-body font-semibold text-foreground">{module.title}</h2>
                    </div>
                    <span className="ml-auto text-body text-muted-foreground">
                      {completedCount} / {module.lessons.length}
                    </span>
                  </div>
                  <ol className="mt-4 flex flex-col divide-y divide-border border-t border-border">
                    {module.lessons.map((lesson, index) => (
                      <li key={lesson.id}>
                        <Link
                          className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                          href={`/sll/aula/${lesson.id}`}
                        >
                          <span className="w-10 shrink-0 text-sm text-muted-foreground">
                            AULA {index + 1}
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
                </article>
              );
            })
          )}
        </section>
      )}
    </AreaShell>
  );
}

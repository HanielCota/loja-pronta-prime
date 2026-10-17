'use client';

import { useActionState, useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { cn } from '@/lib/utils';
import { SllProgress } from './sll-progress';
import { SllLessonVideo } from './sll-lesson-video';
import { sllLessonHref, sllLibraryReturnHref } from '../lesson-navigation';
import { describeSllMaterial } from '../material-format';
import type { SllExpectedMaterial } from '../material-catalog';
import { setSllLessonCompletionForm } from '../server/actions';

export type SllLessonViewerData = {
  returnHref?: string | null;
  track: {
    id: string;
    slug: string;
    title: string;
    kind: 'welcome' | 'method' | 'complementary_course';
  };
  stage: {
    id: string;
    title: string;
    access: { isUnlocked: boolean; lockMessage: string | null };
  };
  module: { id: string; title: string };
  lesson: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number | null;
    completed: boolean;
    previousId: string | null;
    nextId: string | null;
    previousModuleId?: string | null;
    nextModuleId?: string | null;
    sourceNumber?: number | null;
    unavailableMaterial?: SllExpectedMaterial | null;
    number: number;
    total: number;
  };
  lessons: Array<{
    id: string;
    title: string;
    number: number;
    sourceNumber?: number | null;
    durationMinutes: number | null;
    completed: boolean;
    current: boolean;
  }>;
  blocks: Array<{
    id: string;
    kind: 'text' | 'video' | 'link' | 'file' | 'image';
    data: Record<string, string>;
  }>;
  resources: Array<{
    id: string;
    title: string;
    buttonLabel: string | null;
    destination: string | null;
  }>;
};

type SllLessonViewerProps = {
  data: SllLessonViewerData;
  progress?: { completedCount: number; totalCount: number };
  completedHref?: string | null;
};

const INITIAL_ACTION_STATE: { saved: boolean; message: string; completed?: boolean } = {
  saved: false,
  message: '',
};

/**
 * A aula que ela abriu pelos botões ou pela lista: essa aula abre no topo, com o foco no título.
 * Fica fora do componente porque a tela da aula pode ser montada de novo na troca. Quem chega por
 * outro caminho (menu, link, recarregar) segue o comportamento normal da página.
 */
let arrivingLessonId: string | null = null;
const openLesson = (lessonId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
  // Ctrl/Cmd/Shift + clique abre em outra aba ou janela: esta tela não troca de aula.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  arrivingLessonId = lessonId;
};

/** Tela comum de aula: vídeo em destaque, aulas do módulo e conclusão acessível. */
export function SllLessonViewer({ data, progress, completedHref }: SllLessonViewerProps) {
  const [completion, completeAction, isCompleting] = useActionState(
    setSllLessonCompletionForm,
    INITIAL_ACTION_STATE,
  );
  const [viewMessage, setViewMessage] = useState('');
  const statusMessage = completion.message || viewMessage;
  const lessonList = useRef<HTMLOListElement>(null);
  const isLocked = !data.stage.access.isUnlocked;
  const firstVideo = data.blocks.find((block) => block.kind === 'video');
  const isCompleted = completion.completed ?? data.lesson.completed;
  const completionChange = Number(isCompleted) - Number(data.lesson.completed);
  const completedCount =
    (progress?.completedCount ?? data.lessons.filter((lesson) => lesson.completed).length) +
    completionChange;
  const totalCount = progress?.totalCount ?? data.lessons.length;
  const listHref =
    data.track.kind === 'method'
      ? `/sll/metodo/etapa/${data.stage.id}`
      : data.track.kind === 'welcome'
        ? '/sll/comece-aqui'
        : `/sll/cursos/${data.track.slug}`;

  useEffect(() => {
    const list = lessonList.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="step"]');
    // Só rola a lista lateral: abrir a última aula não deve esconder a aula nem mover a página.
    if (list && current && list.scrollHeight > list.clientHeight) {
      list.scrollTop = Math.max(0, current.offsetTop - list.clientHeight / 2);
    }
  }, []);

  useEffect(() => {
    if (isLocked) return;
    let active = true;
    const controller = new AbortController();
    void fetch('/api/sll/progress/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: data.track.id, lessonId: data.lesson.id }),
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const result = await response.json();
        if (active && (!response.ok || !result.saved))
          setViewMessage(
            typeof result.message === 'string'
              ? result.message
              : 'Não foi possível registrar a abertura da aula.',
          );
      })
      .catch(() => {
        if (active) setViewMessage('Não foi possível registrar a abertura da aula. Tente de novo.');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [data.lesson.id, data.track.id, isLocked]);

  useEffect(() => {
    if (arrivingLessonId !== data.lesson.id) return;
    arrivingLessonId = null;
    // Os links não rolam sozinhos (scroll={false}): sem isto, ela ficava no fim da página, longe
    // da aula nova. O foco no título faz o leitor de tela anunciar a aula que abriu.
    document
      .getElementById(isLocked ? 'locked-lesson-title' : 'lesson-title')
      ?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
  }, [data.lesson.id, isLocked]);

  return (
    <div className="flex flex-col gap-6">
      {data.track.kind === 'method' ? (
        <p className="text-sm text-pretty wrap-anywhere text-muted-foreground">
          {data.stage.title} <span aria-hidden="true">·</span> {data.module.title}
        </p>
      ) : null}
      {isLocked ? (
        <section className={cn(panelCard, 'gap-4')} aria-labelledby="locked-lesson-title">
          <h2
            id="locked-lesson-title"
            tabIndex={-1}
            className="text-title font-semibold text-foreground outline-none"
          >
            Esta aula ainda está fechada
          </h2>
          <p className="text-body text-muted-foreground">
            {data.stage.access?.lockMessage ?? 'Conclua a etapa anterior para abrir esta aula.'}
          </p>
          <Button asChild variant="soft">
            <Link href="/sll">Voltar para o SLL</Link>
          </Button>
        </section>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-w-0 flex-col gap-5">
            {firstVideo ? (
              <SllLessonVideo data={firstVideo.data} title={data.lesson.title} />
            ) : null}

            <section className={cn(panelCard, 'gap-4')} aria-labelledby="lesson-title">
              <p className="text-body text-muted-foreground">
                {data.lesson.sourceNumber
                  ? `Aula ${data.lesson.sourceNumber}`
                  : `Aula ${data.lesson.number} de ${data.lesson.total}`}
                {data.lesson.durationMinutes ? ` · ${data.lesson.durationMinutes} min` : ''}
              </p>
              <h2
                id="lesson-title"
                tabIndex={-1}
                className="text-title font-semibold text-balance text-foreground outline-none"
              >
                {data.lesson.title}
              </h2>
              {data.lesson.description ? (
                <p className="text-body text-pretty text-foreground">{data.lesson.description}</p>
              ) : null}
              <LessonBlocks
                blocks={data.blocks}
                primaryVideoId={firstVideo?.id ?? null}
                title={data.lesson.title}
              />
              {data.lesson.unavailableMaterial ? (
                <p className="text-body text-muted-foreground">
                  {data.lesson.unavailableMaterial.title} (
                  {data.lesson.unavailableMaterial.formatLabel}) — em breve.
                </p>
              ) : null}
              {data.resources.length ? (
                <section aria-label="Recursos desta aula" className="border-t border-border pt-5">
                  <h3 className="text-body font-semibold text-foreground">Recursos desta aula</h3>
                  <ul className="mt-3 flex flex-col gap-3">
                    {data.resources.map((resource) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4"
                        key={resource.id}
                      >
                        <span className="text-body font-semibold text-foreground">
                          {resource.title}
                        </span>
                        {resource.destination ? (
                          <Button asChild size="inline" variant="soft">
                            <a
                              href={resource.destination}
                              rel={
                                resource.destination.startsWith('/')
                                  ? undefined
                                  : 'noopener noreferrer'
                              }
                              target={resource.destination.startsWith('/') ? undefined : '_blank'}
                            >
                              {resource.buttonLabel || 'Abrir recurso'}
                              <ExternalLink aria-hidden="true" className="size-5" />
                              {!resource.destination.startsWith('/') ? (
                                <span className="sr-only"> (abre em outra aba)</span>
                              ) : null}
                            </a>
                          </Button>
                        ) : (
                          <span className="text-body text-muted-foreground">Em breve</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="flex flex-col gap-4 border-t border-border pt-5">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.lesson.previousId ? (
                      <Button asChild variant="soft" className="px-4">
                        <Link
                          href={sllLessonHref(
                            data.track.kind,
                            data.lesson.previousId,
                            data.returnHref
                              ? sllLibraryReturnHref(
                                  data.returnHref,
                                  data.lesson.previousModuleId ?? data.module.id,
                                  data.lesson.previousId,
                                )
                              : undefined,
                          )}
                          onClick={openLesson(data.lesson.previousId)}
                          scroll={false}
                        >
                          <ArrowLeft aria-hidden="true" /> Aula anterior
                        </Link>
                      </Button>
                    ) : (
                      <span className="inline-flex min-h-11 items-center text-body text-muted-foreground">
                        Esta é a primeira aula
                      </span>
                    )}
                    {data.lesson.nextId ? (
                      <Button asChild variant="soft" className="px-4">
                        <Link
                          href={sllLessonHref(
                            data.track.kind,
                            data.lesson.nextId,
                            data.returnHref
                              ? sllLibraryReturnHref(
                                  data.returnHref,
                                  data.lesson.nextModuleId ?? data.module.id,
                                  data.lesson.nextId,
                                )
                              : undefined,
                          )}
                          onClick={openLesson(data.lesson.nextId)}
                          scroll={false}
                        >
                          Próxima aula <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="soft" className="px-4">
                        <Link href={listHref}>
                          Voltar às aulas <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    )}
                  </div>
                  <form action={completeAction}>
                    <input type="hidden" name="trackId" value={data.track.id} />
                    <input type="hidden" name="lessonId" value={data.lesson.id} />
                    <input type="hidden" name="completed" value={isCompleted ? 'false' : 'true'} />
                    <Button
                      loading={isCompleting}
                      loadingText="Salvando…"
                      variant={isCompleted ? 'soft' : 'default'}
                    >
                      {isCompleted ? (
                        <RotateCcw aria-hidden="true" />
                      ) : (
                        <Check aria-hidden="true" />
                      )}
                      {isCompleted ? 'Desmarcar como concluída' : 'Marcar como concluída'}
                    </Button>
                  </form>
                </div>
                {statusMessage ? (
                  <p className="text-body text-muted-foreground">{statusMessage}</p>
                ) : null}
              </div>
              <LiveRegion>{statusMessage}</LiveRegion>
            </section>
          </div>

          <aside
            className={cn(
              panelCard,
              'gap-4 p-5 sm:p-6 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)]',
            )}
            aria-label="Aulas deste módulo"
          >
            <div className="shrink-0">
              <h2 className="text-body font-semibold text-foreground">
                {data.track.kind === 'welcome' ? 'Trilha de boas-vindas' : data.module.title}
              </h2>
              <p className="mt-1 text-body text-muted-foreground">
                {data.lessons.length} {data.lessons.length === 1 ? 'aula' : 'aulas'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 border-b border-border pb-4">
              <p className="text-body text-foreground">
                {completedCount} de {totalCount} aulas concluídas
              </p>
              <SllProgress
                label="Progresso das aulas"
                total={totalCount}
                completed={completedCount}
              />
              {completedHref && totalCount > 0 && completedCount === totalCount ? (
                <Button asChild variant="soft">
                  <Link href={completedHref}>Ver etapas do método</Link>
                </Button>
              ) : null}
            </div>
            <ol
              ref={lessonList}
              className="relative flex min-h-0 flex-col gap-1 p-1 xl:overflow-y-auto"
            >
              {data.lessons.map((lesson) => (
                <li key={lesson.id}>
                  {lesson.current ? (
                    <div
                      aria-current="step"
                      className="flex min-h-12 items-center gap-3 rounded-2xl bg-primary-soft px-2 py-2 text-sm font-semibold wrap-anywhere text-link forced-colors:border forced-colors:border-[Highlight]"
                    >
                      <LessonNumber lesson={lesson} />
                      <span className="min-w-0 flex-1">{lesson.title}</span>
                      {isCompleted ? <Check aria-label="Concluída" className="size-5" /> : null}
                    </div>
                  ) : (
                    <Link
                      aria-label={`Abrir aula ${lesson.sourceNumber ?? lesson.number}: ${lesson.title}`}
                      className="flex min-h-12 items-center gap-3 rounded-2xl px-2 py-2 text-sm wrap-anywhere text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors forced-colors:border forced-colors:border-[CanvasText]"
                      href={sllLessonHref(
                        data.track.kind,
                        lesson.id,
                        data.returnHref
                          ? sllLibraryReturnHref(data.returnHref, data.module.id, lesson.id)
                          : undefined,
                      )}
                      onClick={openLesson(lesson.id)}
                      scroll={false}
                    >
                      <LessonNumber lesson={lesson} />
                      <span className="min-w-0 flex-1">{lesson.title}</span>
                      {lesson.completed ? (
                        <Check aria-label="Concluída" className="size-5" />
                      ) : null}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}

function LessonNumber({ lesson }: { lesson: SllLessonViewerData['lessons'][number] }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm',
        lesson.current
          ? 'bg-primary text-primary-foreground forced-colors:border forced-colors:border-[Highlight]'
          : 'border border-border text-muted-foreground',
      )}
    >
      {lesson.sourceNumber ?? lesson.number}
    </span>
  );
}

function LessonBlocks({
  blocks,
  primaryVideoId,
  title,
}: {
  blocks: SllLessonViewerData['blocks'];
  primaryVideoId: string | null;
  title: string;
}) {
  const attachedFiles = (targetId: string) =>
    blocks.filter((item) => item.kind === 'file' && item.data.attachedTo === targetId);
  const fileLink = (file: SllLessonViewerData['blocks'][number]) => (
    <a
      className="inline-flex min-h-11 items-center gap-2 text-body font-medium wrap-anywhere text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:shrink-0"
      href={`/api/sll/material/${file.id}`}
      key={file.id}
    >
      <Download aria-hidden="true" className="size-5" />
      Baixar {file.data.fileName}
      <span className="text-sm text-muted-foreground">
        ({describeSllMaterial(file.data.fileName ?? '', file.data.contentType).label})
      </span>
    </a>
  );
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block) => {
        if (block.kind === 'video') {
          const files = attachedFiles(block.id);
          return block.id !== primaryVideoId || block.data.note || files.length ? (
            <div className="flex flex-col gap-2" key={block.id}>
              {block.id !== primaryVideoId ? (
                <SllLessonVideo data={block.data} title={title} />
              ) : null}
              {block.data.note ? (
                <p className="text-body whitespace-pre-wrap text-foreground">{block.data.note}</p>
              ) : null}
              {files.map(fileLink)}
            </div>
          ) : null;
        }
        if (block.kind === 'text' && block.data.text) {
          return (
            <p className="text-body whitespace-pre-wrap text-foreground" key={block.id}>
              {block.data.text}
            </p>
          );
        }
        if (block.kind === 'link' && block.data.url) {
          return (
            <div className="flex flex-col gap-2" key={block.id}>
              <a
                className="inline-flex min-h-11 items-center gap-2 text-body font-medium wrap-anywhere text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:shrink-0"
                href={block.data.url}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="size-5" />
                {block.data.label || block.data.url}
                <span className="sr-only"> (abre em outra aba)</span>
              </a>
              {block.data.note ? (
                <p className="text-body whitespace-pre-wrap text-foreground">{block.data.note}</p>
              ) : null}
              {attachedFiles(block.id).map(fileLink)}
            </div>
          );
        }
        if (block.kind === 'file' && block.data.fileName) {
          if (block.data.attachedTo && blocks.some((item) => item.id === block.data.attachedTo))
            return null;
          return <p key={block.id}>{fileLink(block)}</p>;
        }
        if (block.kind === 'image' && block.data.alt) {
          return (
            <figure className="flex flex-col gap-2" key={block.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={block.data.alt}
                className="max-h-[32rem] max-w-full self-start rounded-2xl border border-border object-contain forced-colors:border forced-colors:border-[CanvasText]"
                height={720}
                loading="lazy"
                src={`/api/sll/material/${block.id}`}
                width={1280}
              />
              <figcaption className="inline-flex items-center gap-2 text-body text-muted-foreground">
                <ImageIcon aria-hidden="true" className="size-5" />
                {block.data.alt}
              </figcaption>
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}

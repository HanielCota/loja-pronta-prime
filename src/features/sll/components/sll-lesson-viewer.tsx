'use client';

import { useActionState, useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  CirclePlay,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Presentation,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { cn } from '@/lib/utils';
import { isChatGptDestination, isInternalSllDestination } from '../resource-destination';
import { SllProgress } from './sll-progress';
import { describeSllMaterial, type SllMaterialKind } from '../material-format';
import { sllLessonHref, sllLibraryReturnHref } from '../lesson-navigation';
import { setSllLessonCompletionForm, recordSllLessonView } from '../server/actions';

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
  module: { id: string; title: string; number: number };
  lesson: {
    id: string;
    title: string;
    description: string | null;
    sourceNumber: number | null;
    unavailableMaterial: {
      fileName: string;
      title: string;
      formatLabel: string;
    } | null;
    durationMinutes: number | null;
    completed: boolean;
    previousId: string | null;
    previousModuleId: string | null;
    previousIsStepBoundary: boolean;
    nextId: string | null;
    nextModuleId: string | null;
    nextIsStepBoundary: boolean;
    number: number;
    total: number;
  };
  lessons: Array<{
    id: string;
    title: string;
    number: number;
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
    description: string;
    buttonLabel: string | null;
    destination: string | null;
  }>;
  nextStage: { href: string | null; title: string } | null;
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
  const videoBlock = data.blocks.find((block) => block.kind === 'video');
  const hasConfirmedVideo = Boolean(videoBlock?.data.videoId);
  const videoEmbedUrl = videoBlock?.data.embedUrl;
  const hasVideo =
    data.track.kind === 'welcome' || data.blocks.some((block) => block.kind === 'video');
  const isCompleted = completion.completed ?? data.lesson.completed;
  const completionChange = Number(isCompleted) - Number(data.lesson.completed);
  const completedCount =
    (progress?.completedCount ?? data.lessons.filter((lesson) => lesson.completed).length) +
    completionChange;
  const totalCount = progress?.totalCount ?? data.lessons.length;
  const isTrackCompleted = totalCount > 0 && completedCount === totalCount;
  const listHref =
    data.returnHref ??
    (data.track.kind === 'method'
      ? `/sll/metodo/etapa/${data.stage.id}`
      : data.track.kind === 'welcome'
        ? '/sll/comece-aqui'
        : `/sll/cursos/${data.track.slug}`);
  const lessonHref = (lessonId: string, moduleId: string) => {
    const returnHref = data.returnHref
      ? sllLibraryReturnHref(data.returnHref, moduleId, lessonId)
      : undefined;
    return sllLessonHref(data.track.kind, lessonId, returnHref);
  };

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
    void recordSllLessonView(data.track.id, data.lesson.id)
      .then((result) => {
        if (active && !result.saved) setViewMessage(result.message);
      })
      .catch(() => {
        if (active) setViewMessage('Não foi possível guardar a aula para continuar depois.');
      });
    return () => {
      active = false;
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
          {data.stage.title} <span aria-hidden="true">·</span> Passo {data.module.number}:{' '}
          {data.module.title}
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
          <Button asChild variant="default">
            <Link href="/sll">Voltar para o SLL</Link>
          </Button>
        </section>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-w-0 flex-col gap-5">
            {hasVideo ? (
              videoEmbedUrl ? (
                <section className="flex flex-col gap-3" aria-label="Vídeo da aula">
                  <div className="relative aspect-video overflow-hidden rounded-card border border-border bg-muted forced-colors:border forced-colors:border-[CanvasText]">
                    <iframe
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 size-full border-0"
                      sandbox="allow-forms allow-presentation allow-scripts"
                      src={videoEmbedUrl}
                      title={`Vídeo: ${data.lesson.title}`}
                    />
                  </div>
                </section>
              ) : (
                <section
                  className="flex items-start gap-3 rounded-card border border-border bg-muted p-4 forced-colors:border forced-colors:border-[CanvasText]"
                  aria-label="Vídeo da aula"
                >
                  <CirclePlay
                    aria-hidden="true"
                    className="mt-1 size-6 shrink-0 text-muted-foreground"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="text-body font-semibold text-foreground">
                      {hasConfirmedVideo ? 'Vídeo confirmado' : 'Vídeo em breve'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {hasConfirmedVideo
                        ? 'O player aguarda a configuração da hospedagem desta conta.'
                        : 'O vídeo desta aula ainda não está disponível.'}
                    </p>
                  </div>
                </section>
              )
            ) : null}

            <section className={cn(panelCard, 'gap-4')} aria-labelledby="lesson-title">
              <p className="text-body text-muted-foreground">
                Aula {data.lesson.number} de {data.lesson.total}
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
              {data.lesson.unavailableMaterial ? (
                <section
                  aria-label="Material da aula"
                  className="flex items-start gap-3 rounded-2xl border border-border bg-muted p-4 forced-colors:border forced-colors:border-[CanvasText]"
                >
                  <FileText
                    aria-hidden="true"
                    className="mt-1 size-6 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0">
                    <h3 className="text-body font-semibold text-foreground">
                      Material indisponível
                    </h3>
                    <p className="mt-1 text-body text-muted-foreground">
                      {data.lesson.unavailableMaterial.title} ·{' '}
                      {data.lesson.unavailableMaterial.formatLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O arquivo esperado ({data.lesson.unavailableMaterial.fileName}) ainda não foi
                      disponibilizado nesta área.
                    </p>
                  </div>
                </section>
              ) : null}
              <LessonBlocks blocks={data.blocks} />
              {data.resources.length ? (
                <section aria-label="Recursos desta aula" className="border-t border-border pt-5">
                  <h3 className="text-body font-semibold text-foreground">Recursos desta aula</h3>
                  <ul className="mt-3 flex flex-col gap-3">
                    {data.resources.map((resource) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4"
                        key={resource.id}
                      >
                        <div className="min-w-0">
                          <p className="text-body font-semibold text-foreground">
                            {resource.title}
                          </p>
                          {resource.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {resource.description}
                            </p>
                          ) : null}
                          {resource.destination ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {isChatGptDestination(resource.destination)
                                ? 'Abre no ChatGPT em outra aba.'
                                : isInternalSllDestination(resource.destination)
                                  ? 'Abre nesta área.'
                                  : 'Site externo; abre em outra aba.'}
                            </p>
                          ) : null}
                        </div>
                        {resource.destination ? (
                          <Button asChild size="inline" variant="soft">
                            <a
                              href={resource.destination}
                              rel={
                                isInternalSllDestination(resource.destination)
                                  ? undefined
                                  : 'noopener noreferrer'
                              }
                              target={
                                isInternalSllDestination(resource.destination)
                                  ? undefined
                                  : '_blank'
                              }
                            >
                              {resource.buttonLabel || `Abrir ${resource.title}`}
                              {isInternalSllDestination(resource.destination) ? (
                                <ArrowRight aria-hidden="true" className="size-5" />
                              ) : (
                                <ExternalLink aria-hidden="true" className="size-5" />
                              )}
                              {!isInternalSllDestination(resource.destination) ? (
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
                          href={lessonHref(
                            data.lesson.previousId,
                            data.lesson.previousModuleId ?? data.module.id,
                          )}
                          onClick={openLesson(data.lesson.previousId)}
                          scroll={false}
                        >
                          <ArrowLeft aria-hidden="true" />
                          {data.lesson.previousIsStepBoundary ? 'Passo anterior' : 'Aula anterior'}
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
                          href={lessonHref(
                            data.lesson.nextId,
                            data.lesson.nextModuleId ?? data.module.id,
                          )}
                          onClick={openLesson(data.lesson.nextId)}
                          scroll={false}
                        >
                          {data.lesson.nextIsStepBoundary ? 'Próximo passo' : 'Próxima aula'}
                          <ArrowRight aria-hidden="true" />
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
                  {isCompleted ? (
                    <p className="flex items-center gap-2 text-body font-semibold text-progress-text">
                      <Check aria-hidden="true" className="size-5" /> Aula concluída
                    </p>
                  ) : null}
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
                  {completedHref && isTrackCompleted ? (
                    <Button asChild>
                      <Link href={completedHref}>Ver etapas do método</Link>
                    </Button>
                  ) : null}
                  {data.nextStage?.href ? (
                    <Button asChild>
                      <Link href={data.nextStage.href}>
                        Ir para a próxima etapa <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
                {statusMessage ? (
                  <p
                    className={cn(
                      'text-body',
                      completion.message && !completion.saved
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                    )}
                  >
                    {statusMessage}
                  </p>
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
            aria-label={
              data.track.kind === 'welcome'
                ? 'Aulas da trilha de boas-vindas'
                : 'Aulas deste módulo'
            }
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
                      {isCompleted ? (
                        <>
                          <Check aria-hidden="true" className="size-5 shrink-0" />
                          <span className="sr-only">Aula concluída</span>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <Link
                      aria-label={`Abrir aula ${lesson.number}: ${lesson.title}${lesson.completed ? ', aula concluída' : ''}`}
                      className="flex min-h-12 items-center gap-3 rounded-2xl px-2 py-2 text-sm wrap-anywhere text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors forced-colors:border forced-colors:border-[CanvasText]"
                      href={lessonHref(lesson.id, data.module.id)}
                      onClick={openLesson(lesson.id)}
                      scroll={false}
                    >
                      <LessonNumber lesson={lesson} />
                      <span className="min-w-0 flex-1">{lesson.title}</span>
                      {lesson.completed ? (
                        <Check aria-hidden="true" className="size-5 shrink-0" />
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
      {lesson.number}
    </span>
  );
}

function LessonBlocks({ blocks }: { blocks: SllLessonViewerData['blocks'] }) {
  const attachedFiles = (targetId: string) =>
    blocks.filter((item) => item.kind === 'file' && item.data.attachedTo === targetId);
  const fileLink = (file: SllLessonViewerData['blocks'][number]) => {
    const fileName = file.data.fileName || 'material';
    const format = describeSllMaterial(fileName, file.data.contentType);
    const Icon = materialIcon(format.kind);
    return (
      <a
        aria-label={`Baixar ${fileName} (${format.label})`}
        className="inline-flex min-h-11 flex-wrap items-center gap-2 text-body font-medium wrap-anywhere text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:shrink-0"
        href={`/api/sll/material/${file.id}`}
        key={file.id}
      >
        <span>Baixar {fileName}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-sm font-semibold no-underline forced-colors:text-[CanvasText]',
            format.kind === 'pdf' ? 'text-pdf' : 'text-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
          {format.label}
        </span>
      </a>
    );
  };
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block) => {
        if (block.kind === 'video') {
          const files = attachedFiles(block.id);
          return block.data.note || files.length ? (
            <div className="flex flex-col gap-2" key={block.id}>
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
                rel="noopener noreferrer"
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

function materialIcon(kind: SllMaterialKind) {
  switch (kind) {
    case 'pdf':
    case 'document':
    case 'text':
      return FileText;
    case 'spreadsheet':
      return FileSpreadsheet;
    case 'archive':
      return FileArchive;
    case 'presentation':
      return Presentation;
    default:
      return FileText;
  }
}

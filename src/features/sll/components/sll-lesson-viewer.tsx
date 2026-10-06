'use client';

import { useActionState, useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  CirclePlay,
  Download,
  ExternalLink,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { cn } from '@/lib/utils';
import { SllProgress } from './sll-progress';
import { setSllLessonCompletionForm, recordSllLessonView } from '../server/actions';

export type SllLessonViewerData = {
  track: { id: string; title: string; kind: 'welcome' | 'method' | 'complementary_course' };
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
  const isLocked = !data.stage.access.isUnlocked;
  const hasVideo = data.blocks.some((block) => block.kind === 'video');
  const isCompleted = completion.completed ?? data.lesson.completed;
  const completionChange = Number(isCompleted) - Number(data.lesson.completed);
  const completedCount =
    (progress?.completedCount ?? data.lessons.filter((lesson) => lesson.completed).length) +
    completionChange;
  const totalCount = progress?.totalCount ?? data.lessons.length;

  useEffect(() => {
    if (isLocked) return;
    let active = true;
    void recordSllLessonView(data.track.id, data.lesson.id).then((result) => {
      if (active && !result.saved) setViewMessage(result.message);
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
        <p className="text-sm text-muted-foreground">
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
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            {hasVideo ? (
              <section className="flex flex-col gap-3" aria-label="Vídeo da aula">
                <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-card border border-border bg-muted p-4 text-center forced-colors:border forced-colors:border-[CanvasText]">
                  <CirclePlay aria-hidden="true" className="size-12 text-muted-foreground" />
                  <h2 className="text-body font-semibold text-foreground">Vídeo em breve</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  O vídeo desta aula ainda não está disponível.
                </p>
              </section>
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {data.lesson.previousId ? (
                      <Button asChild variant="soft" className="w-auto px-4">
                        <Link
                          href={`/sll/aula/${data.lesson.previousId}`}
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
                      <Button asChild variant="soft" className="w-auto px-4">
                        <Link
                          href={`/sll/aula/${data.lesson.nextId}`}
                          onClick={openLesson(data.lesson.nextId)}
                          scroll={false}
                        >
                          Próxima aula <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
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
                <p aria-live="polite" className="text-body text-muted-foreground empty:hidden">
                  {completion.message || viewMessage}
                </p>
              </div>
            </section>
          </div>

          <aside
            className={cn(panelCard, 'gap-4 lg:sticky lg:top-6')}
            aria-label="Aulas deste módulo"
          >
            <div>
              <h2 className="text-body font-semibold text-foreground">
                {data.track.kind === 'welcome' ? 'Trilha de boas-vindas' : data.module.title}
              </h2>
              <p className="mt-1 text-body text-muted-foreground">
                {data.lessons.length} {data.lessons.length === 1 ? 'aula' : 'aulas'}
              </p>
            </div>
            <div className="flex flex-col gap-3 border-b border-border pb-4">
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
                  <Link href={completedHref}>Começar Etapa 1</Link>
                </Button>
              ) : null}
            </div>
            <ol className="flex flex-col gap-1 p-1 lg:max-h-[calc(100dvh-18rem)] lg:overflow-y-auto">
              {data.lessons.map((lesson) => (
                <li key={lesson.id}>
                  {lesson.current ? (
                    <div
                      aria-current="step"
                      className="flex min-h-14 items-center gap-3 rounded-2xl bg-primary-soft px-3 py-3 text-body font-semibold text-link forced-colors:border forced-colors:border-[Highlight]"
                    >
                      <LessonNumber lesson={lesson} />
                      <span className="min-w-0 flex-1">{lesson.title}</span>
                      {isCompleted ? <Check aria-label="Concluída" className="size-5" /> : null}
                    </div>
                  ) : (
                    <Link
                      aria-label={`Abrir aula ${lesson.number}: ${lesson.title}`}
                      className="flex min-h-14 items-center gap-3 rounded-2xl px-3 py-3 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors forced-colors:border forced-colors:border-[CanvasText]"
                      href={`/sll/aula/${lesson.id}`}
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
      {lesson.number}
    </span>
  );
}

function LessonBlocks({ blocks }: { blocks: SllLessonViewerData['blocks'] }) {
  const attachedFiles = (targetId: string) =>
    blocks.filter((item) => item.kind === 'file' && item.data.attachedTo === targetId);
  const fileLink = (file: SllLessonViewerData['blocks'][number]) => (
    <a
      className="inline-flex min-h-11 items-center gap-2 text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      href={`/api/sll/material/${file.id}`}
      key={file.id}
    >
      <Download aria-hidden="true" className="size-5" />
      Baixar {file.data.fileName}
    </a>
  );
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
                className="inline-flex min-h-11 items-center gap-2 text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                href={block.data.url}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="size-5" />
                {block.data.label || block.data.url}
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

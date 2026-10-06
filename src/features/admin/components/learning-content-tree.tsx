'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CirclePlay,
  Eye,
  Layers3,
  ListTree,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LessonEditor } from './lesson-editor';
import { cn } from '@/lib/utils';
import { panelCard } from '@/features/member/components/area-shell';
import {
  ArchivedLearningContent,
  ContentNodeForm,
  LearningNodeControls,
} from './structure-controls';
import type {
  ArchivedLearningNode,
  EditableLearningNode,
  LearningNodeKind,
} from '../structure-types';

type PublishState = 'draft' | 'published';
type ContentKind = 'text' | 'video' | 'link' | 'file' | 'image';
type LearningLesson =
  LearningTracks[number]['stages'][number]['modules'][number]['lessons'][number];

type LearningTracks = Array<{
  id: string;
  kind: 'welcome' | 'method' | 'complementary_course';
  title: string;
  description: string | null;
  status: PublishState;
  stages: Array<{
    id: string;
    title: string;
    description: string | null;
    status: PublishState;
    modules: Array<{
      id: string;
      title: string;
      description: string | null;
      status: PublishState;
      lessons: Array<{
        id: string;
        title: string;
        description: string | null;
        status: PublishState;
        durationMinutes: number | null;
        slug: string;
        blocks: Array<{ id: string; kind: ContentKind; data: Record<string, string> }>;
      }>;
    }>;
  }>;
}>;

type NavigationStep =
  | { level: 'tracks' }
  | { level: 'stages'; trackId: string }
  | { level: 'modules'; trackId: string; stageId: string }
  | { level: 'lessons'; trackId: string; stageId: string; moduleId: string }
  | { level: 'lesson'; trackId: string; stageId: string; moduleId: string; lessonId: string };

const rowClassName =
  'min-h-16 w-full !justify-between !rounded-2xl !px-4 !py-3 !text-left focus-visible:outline-2 focus-visible:outline-offset-2';

const trackKindLabel = {
  welcome: 'Boas-vindas',
  method: 'Método',
  complementary_course: 'Curso complementar',
} as const;

function statusText(status: PublishState): string {
  return status === 'published' ? 'Publicado' : 'Rascunho';
}

function readText(data: Record<string, string>, key: string): string | undefined {
  return data[key];
}

function LessonBlock({
  block,
}: {
  block: LearningTracks[number]['stages'][number]['modules'][number]['lessons'][number]['blocks'][number];
}) {
  if (block.kind === 'text') {
    const text = readText(block.data, 'text');
    return text ? <p className="text-body text-foreground">{text}</p> : null;
  }

  if (block.kind === 'video') {
    const provider = readText(block.data, 'provider');
    const videoId = readText(block.data, 'videoId');
    return (
      <p className="text-body text-muted-foreground">
        {provider === 'pandavideo' ? 'Vídeo do Panda Video' : 'Vídeo'}
        {videoId ? ` · ID ${videoId}` : ''}
      </p>
    );
  }

  if (block.kind === 'link') {
    const url = readText(block.data, 'url');
    const label = readText(block.data, 'label') ?? url;
    return url ? (
      <a
        className="inline-flex min-h-11 items-center text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        {label}
      </a>
    ) : null;
  }

  if (block.kind === 'file') {
    const fileName = readText(block.data, 'fileName');
    return fileName ? (
      <a
        className="inline-flex min-h-11 items-center text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={`/api/sll/material/${block.id}`}
      >
        Baixar {fileName}
      </a>
    ) : null;
  }

  const alt = readText(block.data, 'alt');
  return alt ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className="max-h-80 max-w-full rounded-2xl border border-border object-contain forced-colors:border forced-colors:border-[CanvasText]"
      height={720}
      src={`/api/sll/material/${block.id}`}
      width={1280}
    />
  ) : null;
}

export function LearningContentTree({
  tracks,
  archived,
}: {
  tracks: LearningTracks;
  archived: ArchivedLearningNode[];
}) {
  const [history, setHistory] = useState<NavigationStep[]>([{ level: 'tracks' }]);
  const [focusVersion, setFocusVersion] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = history[history.length - 1] ?? { level: 'tracks' as const };

  useEffect(() => {
    if (focusVersion === 0) return;
    headingRef.current?.focus();
  }, [focusVersion]);

  function open(next: NavigationStep) {
    setHistory((steps) => [...steps, next]);
    setFocusVersion((version) => version + 1);
  }

  function back() {
    setHistory((steps) => (steps.length > 1 ? steps.slice(0, -1) : steps));
    setFocusVersion((version) => version + 1);
  }

  const track =
    current.level === 'tracks' ? undefined : tracks.find((item) => item.id === current.trackId);
  const stage =
    current.level === 'modules' || current.level === 'lessons' || current.level === 'lesson'
      ? track?.stages.find((item) => item.id === current.stageId)
      : undefined;
  const selectedModule =
    current.level === 'lessons' || current.level === 'lesson'
      ? stage?.modules.find((item) => item.id === current.moduleId)
      : undefined;
  const lesson =
    current.level === 'lesson'
      ? selectedModule?.lessons.find((item) => item.id === current.lessonId)
      : undefined;

  if (current.level !== 'tracks' && (!track || (current.level !== 'stages' && !stage))) {
    return (
      <section className={cn(panelCard, '!p-4 sm:!p-6')}>
        <p className="text-body text-muted-foreground">Este conteúdo não está disponível.</p>
        <Button className="mt-4" onClick={back} type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Button>
      </section>
    );
  }

  if (tracks.length === 0) {
    return (
      <section className={cn(panelCard, '!p-4 sm:!p-6')}>
        <p className="text-body text-muted-foreground">
          Nenhuma trilha de conteúdo foi cadastrada.
        </p>
      </section>
    );
  }

  if (current.level === 'tracks') {
    return (
      <CollectionScreen
        // A chave por nível e pai desmonta o formulário aberto ao navegar: sem ela o
        // formulário de um nível seguia aberto no outro, com o id do item anterior.
        key="track"
        heading="Escolha uma trilha"
        headingRef={headingRef}
        hint="Escolha uma trilha para ver as etapas."
        archived={archived}
        rows={tracks.map((item) => ({
          id: item.id,
          title: item.title,
          detail: `${trackKindLabel[item.kind]} · ${statusText(item.status)}`,
          icon: <ListTree aria-hidden="true" className="size-5" />,
          onClick: () => open({ level: 'stages', trackId: item.id }),
          editable: {
            id: item.id,
            title: item.title,
            description: item.description,
            trackKind: item.kind,
            status: item.status,
          },
        }))}
        management={{ kind: 'track', nodes: tracks, parentId: null }}
      />
    );
  }

  if (!track) return null;

  if (current.level === 'stages') {
    return (
      <CollectionScreen
        back={back}
        context={track.title}
        heading="Etapas"
        key={`stage:${track.id}`}
        headingRef={headingRef}
        rows={track.stages.map((item) => ({
          id: item.id,
          title: item.title,
          detail: `Etapa · ${statusText(item.status)}`,
          icon: <Layers3 aria-hidden="true" className="size-5" />,
          onClick: () => open({ level: 'modules', trackId: track.id, stageId: item.id }),
          editable: {
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
          },
        }))}
        archived={archived}
        management={{ kind: 'stage', nodes: track.stages, parentId: track.id }}
      />
    );
  }

  if (!stage) return null;

  if (current.level === 'modules') {
    return (
      <CollectionScreen
        back={back}
        context={`${track.title} · ${stage.title}`}
        heading="Módulos"
        key={`module:${stage.id}`}
        headingRef={headingRef}
        rows={stage.modules.map((item) => ({
          id: item.id,
          title: item.title,
          detail: `Módulo · ${statusText(item.status)}`,
          icon: <BookOpen aria-hidden="true" className="size-5" />,
          onClick: () =>
            open({ level: 'lessons', trackId: track.id, stageId: stage.id, moduleId: item.id }),
          editable: {
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
          },
        }))}
        archived={archived}
        management={{ kind: 'module', nodes: stage.modules, parentId: stage.id }}
      />
    );
  }

  if (!selectedModule) return null;

  if (current.level === 'lessons') {
    return (
      <CollectionScreen
        back={back}
        context={`${track.title} · ${stage.title} · ${selectedModule.title}`}
        heading="Aulas"
        key={`lesson:${selectedModule.id}`}
        headingRef={headingRef}
        rows={selectedModule.lessons.map((item, index) => ({
          id: item.id,
          title: item.title,
          detail: [
            `Aula ${index + 1}`,
            item.durationMinutes ? `${item.durationMinutes} min` : null,
            statusText(item.status),
          ]
            .filter(Boolean)
            .join(' · '),
          icon: <CirclePlay aria-hidden="true" className="size-5" />,
          action: 'Abrir aula',
          prominent: true,
          onClick: () =>
            open({
              level: 'lesson',
              trackId: track.id,
              stageId: stage.id,
              moduleId: selectedModule.id,
              lessonId: item.id,
            }),
          editable: {
            id: item.id,
            title: item.title,
            description: item.description,
            durationMinutes: item.durationMinutes,
            status: item.status,
          },
        }))}
        archived={archived}
        management={{ kind: 'lesson', nodes: selectedModule.lessons, parentId: selectedModule.id }}
      />
    );
  }

  if (!lesson) return null;

  return (
    <LessonScreen
      back={back}
      context={`${track.title} · ${stage.title} · ${selectedModule.title}`}
      headingRef={headingRef}
      lesson={lesson}
    />
  );
}

type CollectionRow = {
  id: string;
  title: string;
  detail: string;
  icon: ReactNode;
  action?: string;
  prominent?: boolean;
  onClick: () => void;
  editable: EditableLearningNode;
};

function CollectionScreen({
  back,
  context,
  heading,
  headingRef,
  hint,
  rows,
  management,
  archived = [],
}: {
  back?: () => void;
  context?: string;
  heading: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  hint?: string;
  rows: CollectionRow[];
  management: { kind: LearningNodeKind; parentId: string | null; nodes: EditableLearningNode[] };
  archived?: ArchivedLearningNode[];
}) {
  const [formTarget, setFormTarget] = useState<EditableLearningNode | 'new' | null>(null);
  const formCancel = useCallback(() => setFormTarget(null), []);
  const kindName: Record<LearningNodeKind, string> = {
    track: 'trilha',
    stage: 'etapa',
    module: 'módulo',
    lesson: 'aula',
  };
  const archivedHere = archived.filter(
    (item) => item.kind === management.kind && item.parentId === management.parentId,
  );

  return (
    <section className={cn(panelCard, '!p-4 sm:!p-6')} aria-labelledby="content-level-heading">
      {back ? (
        <Button
          className="mb-4 w-fit !rounded-full !px-4 text-foreground"
          onClick={back}
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Button>
      ) : null}
      {context ? <p className="text-base text-muted-foreground">{context}</p> : null}
      <h2
        className="text-title font-semibold text-balance text-foreground"
        id="content-level-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        {heading}
      </h2>
      {hint ? <p className="mt-2 text-body text-muted-foreground">{hint}</p> : null}

      <Button
        className="mt-4 w-fit"
        onClick={() => setFormTarget('new')}
        type="button"
        variant="soft"
      >
        Adicionar {kindName[management.kind]}
      </Button>
      {formTarget ? (
        <ContentNodeForm
          // Remonta ao trocar de item: os campos usam defaultValue e guardariam o texto
          // do item anterior junto com o id do novo.
          key={formTarget === 'new' ? 'new' : formTarget.id}
          {...(formTarget !== 'new' ? { initial: formTarget } : {})}
          kind={management.kind}
          onCancel={formCancel}
          {...(management.parentId ? { parentId: management.parentId } : {})}
        />
      ) : null}

      {rows.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1">
          {rows.map((row, index) => (
            <li className="border-b border-border pb-3 last:border-b-0" key={row.id}>
              <Button
                aria-label={`${row.action ? `${row.action}: ` : ''}${row.title}. ${row.detail}`}
                className={cn(
                  rowClassName,
                  row.prominent && 'bg-primary-soft text-link hover:bg-primary/15',
                )}
                onClick={row.onClick}
                type="button"
                variant="ghost"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 text-muted-foreground">{row.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-body font-semibold text-foreground">
                      {row.title}
                    </span>
                    <span className="block text-base font-normal text-muted-foreground">
                      {row.detail}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-base font-medium text-link">
                  {row.action ? <span>{row.action}</span> : null}
                  <ChevronRight aria-hidden="true" className="size-5" />
                </span>
              </Button>
              <LearningNodeControls
                first={index === 0}
                kind={management.kind}
                last={index === rows.length - 1}
                node={row.editable}
                onEdit={setFormTarget}
                {...(management.parentId ? { parentId: management.parentId } : {})}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-body text-muted-foreground">Nada por aqui ainda.</p>
      )}
      {archivedHere.length > 0 || management.kind === 'track' ? (
        <ArchivedLearningContent items={archivedHere} />
      ) : null}
    </section>
  );
}

function LessonScreen({
  back,
  context,
  headingRef,
  lesson,
}: {
  back: () => void;
  context: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  lesson: LearningLesson;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          className="w-fit !rounded-full !px-4 text-foreground"
          onClick={() => setEditing(false)}
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" />
          Voltar para a aula
        </Button>
        <LessonEditor lesson={lesson} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <section className={cn(panelCard, '!p-4 sm:!p-6')} aria-labelledby="content-level-heading">
      <Button
        className="mb-4 w-fit !rounded-full !px-4 text-foreground"
        onClick={back}
        type="button"
        variant="ghost"
      >
        <ArrowLeft aria-hidden="true" />
        Voltar
      </Button>
      <p className="text-base text-muted-foreground">{context}</p>
      <h2
        className="text-title font-semibold text-balance text-foreground"
        id="content-level-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        {lesson.title}
      </h2>
      <p className="mt-2 text-base text-muted-foreground">
        {lesson.durationMinutes ? `${lesson.durationMinutes} min · ` : ''}
        {statusText(lesson.status)}
      </p>
      <Button className="mt-4 w-fit" onClick={() => setEditing(true)} type="button" variant="soft">
        Editar aula
      </Button>
      <Button asChild className="mt-2 w-fit" variant="ghost">
        <Link href={`/admin/preview/${lesson.id}`}>
          <Eye aria-hidden="true" />
          Pré-visualizar como aluna
        </Link>
      </Button>

      <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
        {lesson.description ? (
          <p className="text-body text-foreground">{lesson.description}</p>
        ) : null}
        {lesson.blocks.map((block) => (
          <LessonBlock key={block.id} block={block} />
        ))}
        {lesson.blocks.length === 0 && !lesson.description ? (
          <p className="text-body text-muted-foreground">Esta aula ainda não tem conteúdo.</p>
        ) : null}
      </div>
    </section>
  );
}

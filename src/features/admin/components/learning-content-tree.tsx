'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { ReactNode, RefObject } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CirclePlay,
  Eye,
  Layers3,
  ListTree,
  GripVertical,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LessonEditor } from './lesson-editor';
import { cn } from '@/lib/utils';
import { panelCard } from '@/features/member/components/area-shell';
import {
  discardNodeDraft,
  publishNodeDraft,
  reorderLearningNodes,
  restorePreviousNodeVersion,
} from '../server/actions';
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
  coverStorageKey: string | null;
  coverAlt: string | null;
  featured: boolean;
  status: PublishState;
  hasDraft: boolean;
  hasHistory: boolean;
  stages: Array<{
    id: string;
    title: string;
    description: string | null;
    status: PublishState;
    hasDraft: boolean;
    hasHistory: boolean;
    modules: Array<{
      id: string;
      title: string;
      description: string | null;
      status: PublishState;
      hasDraft: boolean;
      hasHistory: boolean;
      lessons: Array<{
        id: string;
        title: string;
        description: string | null;
        status: PublishState;
        hasDraft: boolean;
        hasHistory: boolean;
        durationMinutes: number | null;
        countsTowardProgress: boolean;
        slug: string;
        blocks: Array<{ id: string; kind: ContentKind; data: Record<string, string> }>;
        relatedLessonId: string | null;
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
  'min-h-16 min-w-0 flex-1 !justify-between !rounded-2xl !px-4 !py-3 !text-left focus-visible:outline-2 focus-visible:outline-offset-2';

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
        {provider === 'pandavideo' ? 'Espaço do vídeo' : 'Vídeo'}
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
        href={`/api/admin/learning-content/draft-media/${block.id}`}
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
      src={`/api/admin/learning-content/draft-media/${block.id}`}
      width={1280}
    />
  ) : null;
}

export function LearningContentTree({
  tracks,
  archived,
  selectedKind,
}: {
  tracks: LearningTracks;
  archived: ArchivedLearningNode[];
  selectedKind?: LearningTracks[number]['kind'];
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

  if (current.level === 'tracks') {
    return (
      <CollectionScreen
        heading={selectedKind === 'complementary_course' ? 'Cursos' : 'Conteúdo'}
        headingRef={headingRef}
        hint="Abra um item para ver as etapas, aulas e materiais."
        archived={archived}
        rows={tracks.map((item) => ({
          id: item.id,
          title: item.title,
          detail: `${trackKindLabel[item.kind]} · ${statusText(item.status)}${item.hasDraft ? ' · Alterações em rascunho' : ''}`,
          icon: <ListTree aria-hidden="true" className="size-5" />,
          onClick: () => open({ level: 'stages', trackId: item.id }),
          editable: {
            id: item.id,
            title: item.title,
            description: item.description,
            trackKind: item.kind,
            coverStorageKey: item.coverStorageKey,
            coverAlt: item.coverAlt,
            featured: item.featured,
            hasDraft: item.hasDraft,
            hasHistory: item.hasHistory,
            status: item.status,
          },
        }))}
        management={{
          kind: 'track',
          nodes: tracks,
          parentId: null,
          ...(selectedKind ? { trackKind: selectedKind } : {}),
        }}
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
          detail: `Etapa · ${statusText(item.status)}${item.hasDraft ? ' · Alterações em rascunho' : ''}`,
          icon: <Layers3 aria-hidden="true" className="size-5" />,
          onClick: () => open({ level: 'modules', trackId: track.id, stageId: item.id }),
          editable: {
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
            hasDraft: item.hasDraft,
            hasHistory: item.hasHistory,
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
          detail: `Módulo · ${statusText(item.status)}${item.hasDraft ? ' · Alterações em rascunho' : ''}`,
          icon: <BookOpen aria-hidden="true" className="size-5" />,
          onClick: () =>
            open({ level: 'lessons', trackId: track.id, stageId: stage.id, moduleId: item.id }),
          editable: {
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
            hasDraft: item.hasDraft,
            hasHistory: item.hasHistory,
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
        lessonChoices={track.stages.flatMap((item) =>
          item.modules.flatMap((group) =>
            group.lessons.map((entry) => ({ id: entry.id, title: entry.title })),
          ),
        )}
        rows={selectedModule.lessons.map((item, index) => ({
          id: item.id,
          title: item.title,
          detail: [
            `Aula ${index + 1}`,
            item.durationMinutes ? `${item.durationMinutes} min` : null,
            statusText(item.status),
            item.hasDraft ? 'Alterações em rascunho' : null,
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
            countsTowardProgress: item.countsTowardProgress,
            relatedLessonId: item.relatedLessonId,
            status: item.status,
            hasDraft: item.hasDraft,
            hasHistory: item.hasHistory,
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
      siblingLessons={selectedModule.lessons.map((item) => ({ id: item.id, title: item.title }))}
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

function SortableContentRow({
  row,
  index,
  count,
  management,
  onEdit,
}: {
  row: CollectionRow;
  index: number;
  count: number;
  management: {
    kind: LearningNodeKind;
    parentId: string | null;
    trackKind?: LearningTracks[number]['kind'];
  };
  onEdit: (node: EditableLearningNode) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({ id: row.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), zIndex: isDragging ? 1 : undefined }}
      className={cn(
        'relative border-b border-border pb-3 last:border-b-0 motion-safe:transition-transform',
        isDragging && 'rounded-2xl bg-card shadow-card',
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          ref={setActivatorNodeRef}
          aria-label={`Arrastar ${row.title} para mudar a ordem`}
          className="flex size-11 shrink-0 touch-none items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="button"
        >
          <GripVertical aria-hidden="true" className="size-5" />
        </button>
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
              <span className="block text-body font-semibold text-foreground">{row.title}</span>
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
      </div>
      <LearningNodeControls
        first={index === 0}
        kind={management.kind}
        last={index === count - 1}
        node={row.editable}
        onEdit={onEdit}
        {...(management.trackKind ? { trackKind: management.trackKind } : {})}
        {...(management.parentId ? { parentId: management.parentId } : {})}
      />
    </li>
  );
}

function SortableContentList({
  rows,
  management,
  onEdit,
}: {
  rows: CollectionRow[];
  management: {
    kind: LearningNodeKind;
    parentId: string | null;
    trackKind?: LearningTracks[number]['kind'];
  };
  onEdit: (node: EditableLearningNode) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState(() => rows.map((row) => row.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const sorted = order
    .map((id) => byId.get(id))
    .filter((row): row is CollectionRow => Boolean(row));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || pending) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const previous = order;
    const next = arrayMove(order, from, to);
    setOrder(next);
    setMessage('');
    const data = new FormData();
    data.set('kind', management.kind);
    if (management.parentId) data.set('parentId', management.parentId);
    if (management.trackKind) data.set('trackKind', management.trackKind);
    next.forEach((id) => data.append('id', id));
    startTransition(async () => {
      const result = await reorderLearningNodes(data);
      setMessage(result.message);
      if (result.saved) router.refresh();
      else setOrder(previous);
    });
  }

  return (
    <>
      {rows.length > 1 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Arraste pelo marcador para mudar a ordem. Pelo teclado, use Espaço e as setas; os botões
          Subir e Descer também funcionam.
        </p>
      ) : null}
      <DndContext
        id={`learning-${management.kind}-${management.parentId ?? 'root'}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="mt-4 flex flex-col gap-1" aria-busy={pending}>
            {sorted.map((row, index) => (
              <SortableContentRow
                key={row.id}
                row={row}
                index={index}
                count={sorted.length}
                management={management}
                onEdit={onEdit}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {message ? <output className="mt-3 text-body text-muted-foreground">{message}</output> : null}
    </>
  );
}

function CollectionScreen({
  back,
  context,
  heading,
  headingRef,
  hint,
  rows,
  management,
  archived = [],
  lessonChoices = [],
}: {
  back?: () => void;
  context?: string;
  heading: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  hint?: string;
  rows: CollectionRow[];
  management: {
    kind: LearningNodeKind;
    parentId: string | null;
    nodes: EditableLearningNode[];
    trackKind?: LearningTracks[number]['kind'];
  };
  archived?: ArchivedLearningNode[];
  lessonChoices?: Array<{ id: string; title: string }>;
}) {
  const [formTarget, setFormTarget] = useState<EditableLearningNode | 'new' | null>(null);
  const formCancel = useCallback(() => setFormTarget(null), []);
  const kindName: Record<LearningNodeKind, string> = {
    track: management.trackKind === 'complementary_course' ? 'curso' : 'conteúdo',
    stage: 'etapa',
    module: 'módulo',
    lesson: 'aula',
  };
  const archivedHere = archived.filter(
    (item) => item.kind === management.kind && item.parentId === management.parentId,
  );

  if (formTarget) {
    return (
      <section className={cn(panelCard, '!p-4 sm:!p-6')} aria-label="Editar conteúdo">
        <Button className="w-fit" onClick={formCancel} type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" /> Voltar à lista
        </Button>
        <p className="mt-3 text-body text-muted-foreground">
          {context ? `${context} · ` : ''}
          {formTarget === 'new' ? `Novo ${kindName[management.kind]}` : formTarget.title}
        </p>
        <ContentNodeForm
          {...(formTarget !== 'new' ? { initial: formTarget } : {})}
          {...(management.trackKind ? { defaultTrackKind: management.trackKind } : {})}
          kind={management.kind}
          lessonChoices={lessonChoices.filter(
            (choice) => formTarget === 'new' || choice.id !== formTarget.id,
          )}
          onCancel={formCancel}
          {...(management.parentId ? { parentId: management.parentId } : {})}
        />
      </section>
    );
  }

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

      {management.kind !== 'track' ||
      management.trackKind === 'complementary_course' ||
      rows.length === 0 ? (
        <Button
          className="mt-4 w-fit"
          onClick={() => setFormTarget('new')}
          type="button"
          variant="soft"
        >
          Adicionar {kindName[management.kind]}
        </Button>
      ) : null}
      {rows.length > 0 ? (
        <SortableContentList
          key={rows.map((row) => row.id).join(':')}
          rows={rows}
          management={management}
          onEdit={setFormTarget}
        />
      ) : (
        <p className="mt-4 text-body text-muted-foreground">Nada por aqui ainda.</p>
      )}
      {archivedHere.length > 0 ? <ArchivedLearningContent items={archivedHere} /> : null}
    </section>
  );
}

function LessonScreen({
  back,
  context,
  headingRef,
  lesson,
  siblingLessons,
}: {
  back: () => void;
  context: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  lesson: LearningLesson;
  siblingLessons: Array<{ id: string; title: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftPending, startDraftTransition] = useTransition();
  const router = useRouter();

  function changeDraft(action: 'publish' | 'discard' | 'restore') {
    if (
      action === 'discard' &&
      !window.confirm('Descartar as alterações desta aula? A versão publicada continua visível.')
    )
      return;
    if (action === 'restore' && !window.confirm('Restaurar a versão anterior desta aula?')) return;
    const data = new FormData();
    data.set('kind', 'lesson');
    data.set('nodeId', lesson.id);
    startDraftTransition(async () => {
      const result =
        action === 'publish'
          ? await publishNodeDraft(data)
          : action === 'discard'
            ? await discardNodeDraft(data)
            : await restorePreviousNodeVersion(data);
      setDraftMessage(result.message);
      if (result.saved) router.refresh();
    });
  }

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
        <LessonEditor
          // Pela aula, não pelo conteúdo: enviar, remover ou reordenar atualiza a aula e não pode
          // apagar o que a admin ainda não salvou.
          key={lesson.id}
          lesson={lesson}
          siblingLessons={siblingLessons}
          onCancel={() => setEditing(false)}
        />
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
        {lesson.hasDraft ? ' · Alterações em rascunho' : ''}
      </p>
      {lesson.hasDraft ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="w-fit"
            disabled={draftPending}
            onClick={() => changeDraft('publish')}
            type="button"
          >
            Publicar alterações
          </Button>
          <Button
            className="w-fit"
            disabled={draftPending}
            onClick={() => changeDraft('discard')}
            type="button"
            variant="ghost"
          >
            Descartar rascunho
          </Button>
        </div>
      ) : null}
      {lesson.hasHistory && !lesson.hasDraft ? (
        <Button
          className="mt-4 w-fit"
          disabled={draftPending}
          onClick={() => changeDraft('restore')}
          type="button"
          variant="ghost"
        >
          Voltar à versão anterior
        </Button>
      ) : null}
      {draftMessage ? (
        <p aria-live="polite" className="mt-2 text-body text-muted-foreground">
          {draftMessage}
        </p>
      ) : null}
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

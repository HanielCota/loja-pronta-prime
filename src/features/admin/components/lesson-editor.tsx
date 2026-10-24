'use client';

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAdminConfirmation } from './admin-confirmation';
import {
  Eye,
  FilePlus2,
  Film,
  GripVertical,
  ImagePlus,
  Link2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { panelCard } from '@/features/member/components/area-shell';
import { LessonDraftPreview, type DraftPreviewBlock } from './lesson-draft-preview';
import { removeLessonBlock, reorderLessonBlocks, saveLearningLesson } from '../server/actions';
import type { LessonEditState } from '../server/actions';
import { SelectMenu as Select } from '@/components/ui/select-menu';
import { Textarea } from '@/components/ui/textarea';
import { FileField } from '@/components/ui/file-field';

const initialLessonEditState: LessonEditState = { message: '', saved: false };

type EditableBlock = {
  id: string;
  kind: 'text' | 'link' | 'video' | 'file' | 'image';
  data: Record<string, string>;
};
type NewBlockKind = EditableBlock['kind'];

const newBlockTitle: Record<NewBlockKind, string> = {
  text: 'Novo texto',
  link: 'Novo link',
  video: 'Novo vídeo',
  image: 'Nova imagem',
  file: 'Novo arquivo',
};

const removeBlockLabel: Record<NewBlockKind, string> = {
  text: 'Remover texto',
  link: 'Remover link',
  video: 'Remover vídeo',
  image: 'Remover imagem',
  file: 'Remover arquivo',
};

function SortableLessonBlock({
  id,
  title,
  children,
  onRemove,
}: {
  id: string;
  title: string;
  children: ReactNode;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({ id });
  return (
    <div
      className={cn('relative', isDragging && 'z-10')}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${title} para mudar a ordem`}
          className="inline-flex min-h-11 touch-none items-center gap-2 rounded-full px-3 text-body text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          ref={setActivatorNodeRef}
          type="button"
        >
          <GripVertical aria-hidden="true" className="size-5" /> Arrastar
        </button>
        <Button
          aria-label={`Remover ${title}`}
          className="!w-fit !px-3"
          onClick={onRemove}
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" /> Remover
        </Button>
      </div>
      {children}
    </div>
  );
}

export function LessonEditor({
  lesson,
  siblingLessons,
  onCancel,
}: {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    blocks: Array<{ id: string; kind: string; data: Record<string, string> }>;
  };
  siblingLessons: Array<{ id: string; title: string }>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // O editor substitui a tela da aula: sem isto, o foco cairia no início da página.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const [newBlocks, setNewBlocks] = useState<Array<{ key: string; kind: NewBlockKind }>>([]);
  const [previewChanged, setPreviewChanged] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: LessonEditState, formData: FormData) => {
      const next = await saveLearningLesson(previous, formData);
      if (next.saved) {
        setNewBlocks([]);
        setPreviewChanged(false);
        router.refresh();
      }
      return next;
    },
    initialLessonEditState,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    blocks: DraftPreviewBlock[];
  }>({ title: '', description: '', blocks: [] });
  const [uploadNotice, setUploadNotice] = useState('');
  const [blockPending, startBlockTransition] = useTransition();
  const [blockMessage, setBlockMessage] = useState('');
  const editableBlocks = lesson.blocks.filter(
    (block): block is EditableBlock =>
      block.kind === 'text' ||
      block.kind === 'link' ||
      block.kind === 'video' ||
      block.kind === 'file' ||
      block.kind === 'image',
  );
  const attachmentTargets = editableBlocks.filter(
    (block) => block.kind === 'video' || block.kind === 'link',
  );
  const [blockOrder, setBlockOrder] = useState(() => editableBlocks.map((block) => block.id));
  const blocksById = new Map(editableBlocks.map((block) => [block.id, block]));
  const completeOrder = [
    ...blockOrder.filter((id) => blocksById.has(id)),
    ...editableBlocks.filter((block) => !blockOrder.includes(block.id)).map((block) => block.id),
  ];
  const orderedBlocks = completeOrder
    .map((id) => blocksById.get(id))
    .filter((block): block is EditableBlock => Boolean(block));
  // A prévia segue a aula salva até a admin mexer no formulário. Depois disso, cada material
  // salvo mostra o que foi digitado, e os enviados, removidos ou reordenados aparecem na hora.
  const typedBlocks = new Map(draft.blocks.map((block) => [block.id, block]));
  const previewBlocks: DraftPreviewBlock[] = previewChanged
    ? [
        ...orderedBlocks.map((block) => typedBlocks.get(block.id) ?? block),
        ...draft.blocks.filter((block) => newBlocks.some((item) => item.key === block.id)),
      ]
    : orderedBlocks;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || blockPending) return;
    const from = completeOrder.indexOf(String(active.id));
    const to = completeOrder.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const previous = completeOrder;
    const next = arrayMove(completeOrder, from, to);
    setBlockOrder(next);
    const data = new FormData();
    data.set('lessonId', lesson.id);
    next.forEach((id) => data.append('id', id));
    startBlockTransition(async () => {
      const result = await reorderLessonBlocks(data);
      setBlockMessage(result.message);
      if (result.saved) {
        router.refresh();
        return;
      }
      setBlockOrder(previous);
    });
  }
  const confirmation = useAdminConfirmation();
  async function removeBlock(block: EditableBlock) {
    if (
      !(await confirmation.ask({
        title: `Remover ${block.kind === 'file' ? 'arquivo' : 'material'} da aula?`,
        description: 'Este item será removido do rascunho da aula.',
        confirmLabel: 'Remover',
      }))
    )
      return;
    const data = new FormData();
    data.set('lessonId', lesson.id);
    data.set('blockId', block.id);
    startBlockTransition(async () => {
      const result = await removeLessonBlock(data);
      setBlockMessage(result.message);
      if (result.saved) router.refresh();
    });
  }
  const newContentIndex = (index: number) =>
    newBlocks.slice(0, index).filter((block) => block.kind !== 'image' && block.kind !== 'file')
      .length;

  function updatePreview(form: HTMLFormElement) {
    const fields = new FormData(form);
    const value = (name: string, fallback = '') => String(fields.get(name) ?? fallback);
    const blocks: DraftPreviewBlock[] = orderedBlocks.map((block) => ({
      ...block,
      data: {
        ...block.data,
        ...(block.kind === 'text' ? { text: value(`block:${block.id}:text`) } : {}),
        ...(block.kind === 'link'
          ? {
              label: value(`block:${block.id}:label`),
              url: value(`block:${block.id}:url`),
              note: value(`block:${block.id}:note`),
            }
          : {}),
        ...(block.kind === 'video'
          ? { videoId: value(`block:${block.id}:videoId`), note: value(`block:${block.id}:note`) }
          : {}),
        ...(block.kind === 'file' ? { fileName: value(`block:${block.id}:fileName`) } : {}),
        ...(block.kind === 'image' ? { alt: value(`block:${block.id}:alt`) } : {}),
      },
    }));
    newBlocks.forEach((block, index) => {
      if (block.kind === 'file' || block.kind === 'image') return;
      const prefix = `newBlock:${newContentIndex(index)}`;
      blocks.push({
        id: block.key,
        kind: block.kind,
        data:
          block.kind === 'text'
            ? { text: value(`${prefix}:text`) }
            : block.kind === 'link'
              ? {
                  label: value(`${prefix}:label`),
                  url: value(`${prefix}:url`),
                  note: value(`${prefix}:note`),
                }
              : {
                  provider: 'pandavideo',
                  videoId: value(`${prefix}:videoId`),
                  note: value(`${prefix}:note`),
                },
      });
    });
    setDraft({ title: value('title'), description: value('description'), blocks });
    setPreviewChanged(true);
  }

  // Imagem e arquivo novos vão pelo envio próprio, não pelo "Salvar alterações": só texto,
  // link e vídeo entram no formulário, numerados na ordem em que o servidor vai ler.
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      {confirmation.dialog}
      <fieldset className="grid grid-cols-2 gap-2 xl:hidden">
        <legend className="sr-only">Editar ou ver prévia</legend>
        <Button
          aria-pressed={!showPreview}
          onClick={() => setShowPreview(false)}
          type="button"
          variant={!showPreview ? 'default' : 'soft'}
        >
          <Pencil aria-hidden="true" data-icon="inline-start" />
          Editar
        </Button>
        <Button
          aria-pressed={showPreview}
          onClick={() => setShowPreview(true)}
          type="button"
          variant={showPreview ? 'default' : 'soft'}
        >
          <Eye aria-hidden="true" data-icon="inline-start" />
          Prévia
        </Button>
      </fieldset>
      <form
        noValidate
        action={formAction}
        onInput={(event) => updatePreview(event.currentTarget)}
        onChange={(event) => updatePreview(event.currentTarget)}
        className={cn(panelCard, '!p-4 sm:!p-6', showPreview && 'hidden xl:flex')}
      >
        <input name="lessonId" type="hidden" value={lesson.id} />
        <h3
          className="rounded-xl text-title font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          ref={headingRef}
          tabIndex={-1}
        >
          Editar aula
        </h3>
        <p className="mt-2 text-body text-muted-foreground">
          Altere o título e os materiais. Confira a prévia antes de salvar.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <FloatingLabelInput
            defaultValue={lesson.title}
            id="lesson-title"
            label="Título da aula"
            name="title"
            required
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-description">Descrição da aula</Label>
            <Textarea
              className="min-h-28"
              defaultValue={lesson.description ?? ''}
              id="lesson-description"
              maxLength={1200}
              name="description"
            />
          </div>

          {blockMessage ? <p className="text-body text-muted-foreground">{blockMessage}</p> : null}
          <LiveRegion>{blockMessage}</LiveRegion>
          <DndContext
            id={`lesson-blocks-${lesson.id}`}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            sensors={sensors}
          >
            <SortableContext items={completeOrder} strategy={verticalListSortingStrategy}>
              {orderedBlocks.map((block, index) => (
                <SortableLessonBlock
                  id={block.id}
                  key={block.id}
                  onRemove={() => removeBlock(block)}
                  title={`${block.kind === 'file' ? 'arquivo' : 'material'} ${index + 1}`}
                >
                  <fieldset className="flex flex-col gap-3 rounded-2xl border border-border p-4 forced-colors:border forced-colors:border-[CanvasText]">
                    <legend className="px-1 text-body font-semibold text-foreground">
                      {`${
                        block.kind === 'text'
                          ? 'Texto'
                          : block.kind === 'link'
                            ? 'Link'
                            : block.kind === 'video'
                              ? 'Vídeo'
                              : block.kind === 'image'
                                ? 'Imagem'
                                : 'Arquivo'
                      } ${index + 1}`}
                    </legend>
                    <input name="blockId" type="hidden" value={block.id} />
                    <input name={`block:${block.id}:kind`} type="hidden" value={block.kind} />
                    {block.kind === 'text' ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`block-${block.id}-text`}>Texto da aula</Label>
                        <Textarea
                          className="min-h-36"
                          defaultValue={block.data.text ?? ''}
                          id={`block-${block.id}-text`}
                          maxLength={12000}
                          name={`block:${block.id}:text`}
                          required
                        />
                      </div>
                    ) : block.kind === 'link' ? (
                      <>
                        <FloatingLabelInput
                          defaultValue={block.data.label ?? ''}
                          id={`block-${block.id}-label`}
                          label="Nome do link"
                          name={`block:${block.id}:label`}
                          required
                        />
                        <FloatingLabelInput
                          autoCapitalize="none"
                          defaultValue={block.data.url ?? ''}
                          id={`block-${block.id}-url`}
                          label="Endereço do link"
                          name={`block:${block.id}:url`}
                          required
                          type="url"
                        />
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`block-${block.id}-note`}>Anotação para este link</Label>
                          <Textarea
                            className="min-h-24"
                            defaultValue={block.data.note ?? ''}
                            id={`block-${block.id}-note`}
                            maxLength={3000}
                            name={`block:${block.id}:note`}
                          />
                        </div>
                      </>
                    ) : block.kind === 'video' ? (
                      <>
                        <FloatingLabelInput
                          defaultValue={block.data.videoId ?? ''}
                          name={`block:${block.id}:videoId`}
                          id={`block-${block.id}-video`}
                          label="Link ou ID do vídeo Panda"
                          autoCapitalize="none"
                          spellCheck={false}
                        />
                        <p className="text-body text-muted-foreground">
                          Cole o link do player Panda ou o ID do vídeo. Deixe vazio para mostrar
                          “Vídeo em breve”.
                        </p>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`block-${block.id}-note`}>Anotação para este vídeo</Label>
                          <Textarea
                            className="min-h-24"
                            defaultValue={block.data.note ?? ''}
                            id={`block-${block.id}-note`}
                            maxLength={3000}
                            name={`block:${block.id}:note`}
                          />
                        </div>
                      </>
                    ) : block.kind === 'file' ? (
                      <>
                        <FloatingLabelInput
                          defaultValue={block.data.fileName ?? ''}
                          id={`block-${block.id}-file-name`}
                          label="Nome do arquivo"
                          name={`block:${block.id}:fileName`}
                          required
                        />
                        <AttachmentSelect
                          defaultValue={block.data.attachedTo ?? ''}
                          id={`block-${block.id}-attached-to`}
                          name={`block:${block.id}:attachedTo`}
                          targets={attachmentTargets}
                        />
                        <a
                          className="inline-flex min-h-11 items-center text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          href={`/api/admin/learning-content/draft-media/${block.id}`}
                        >
                          Baixar arquivo atual
                        </a>
                        <MediaUpload
                          blockId={block.id}
                          kind="file"
                          lessonId={lesson.id}
                          attachmentTargets={attachmentTargets}
                          onUploaded={() => router.refresh()}
                        />
                      </>
                    ) : (
                      <>
                        <MediaUpload
                          blockId={block.id}
                          initialAlt={block.data.alt ?? ''}
                          kind="image"
                          lessonId={lesson.id}
                          altFieldName={`block:${block.id}:alt`}
                          onUploaded={() => router.refresh()}
                        />
                      </>
                    )}
                  </fieldset>
                </SortableLessonBlock>
              ))}
            </SortableContext>
          </DndContext>
          {editableBlocks.length === 0 ? (
            <p className="text-body text-muted-foreground">
              Esta aula ainda não tem texto ou link para editar.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-3">
            <Button
              className="!w-full"
              onClick={() =>
                setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'text' }])
              }
              type="button"
              variant="soft"
            >
              <Plus aria-hidden="true" />
              <Type aria-hidden="true" />
              Adicionar texto
            </Button>
            <Button
              className="!w-full"
              onClick={() =>
                setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'link' }])
              }
              type="button"
              variant="soft"
            >
              <Plus aria-hidden="true" />
              <Link2 aria-hidden="true" />
              Adicionar link
            </Button>
            <Button
              className="!w-full"
              onClick={() =>
                setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'video' }])
              }
              type="button"
              variant="soft"
            >
              <Plus aria-hidden="true" />
              <Film aria-hidden="true" />
              Adicionar vídeo
            </Button>
            <Button
              className="!w-full"
              onClick={() =>
                setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'image' }])
              }
              type="button"
              variant="soft"
            >
              <Plus aria-hidden="true" />
              <ImagePlus aria-hidden="true" />
              Adicionar imagem
            </Button>
            <Button
              className="!w-full"
              onClick={() =>
                setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'file' }])
              }
              type="button"
              variant="soft"
            >
              <Plus aria-hidden="true" />
              <FilePlus2 aria-hidden="true" />
              Adicionar arquivo
            </Button>
          </div>

          {newBlocks.map((block, index) => (
            <fieldset
              className="flex flex-col gap-3 rounded-2xl border border-border p-4 forced-colors:border forced-colors:border-[CanvasText]"
              key={block.key}
            >
              <legend className="px-1 text-body font-semibold text-foreground">
                {newBlockTitle[block.kind]}
              </legend>
              {block.kind === 'text' || block.kind === 'link' || block.kind === 'video' ? (
                <input name="newBlockKind" type="hidden" value={block.kind} />
              ) : null}
              {block.kind === 'text' ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`new-block-${block.key}-text`}>Texto da aula</Label>
                  <Textarea
                    className="min-h-36"
                    id={`new-block-${block.key}-text`}
                    maxLength={12000}
                    name={`newBlock:${newContentIndex(index)}:text`}
                    required
                  />
                </div>
              ) : block.kind === 'link' ? (
                <>
                  <FloatingLabelInput
                    id={`new-block-${block.key}-label`}
                    label="Nome do link"
                    name={`newBlock:${newContentIndex(index)}:label`}
                    required
                  />
                  <FloatingLabelInput
                    autoCapitalize="none"
                    id={`new-block-${block.key}-url`}
                    label="Endereço do link"
                    name={`newBlock:${newContentIndex(index)}:url`}
                    required
                    type="url"
                  />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`new-block-${block.key}-note`}>Anotação para este link</Label>
                    <Textarea
                      className="min-h-24"
                      id={`new-block-${block.key}-note`}
                      maxLength={3000}
                      name={`newBlock:${newContentIndex(index)}:note`}
                    />
                  </div>
                </>
              ) : block.kind === 'video' ? (
                <>
                  <FloatingLabelInput
                    name={`newBlock:${newContentIndex(index)}:videoId`}
                    id={`new-block-${block.key}-video`}
                    label="Link ou ID do vídeo Panda"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <p className="text-body text-muted-foreground">
                    Cole o link do player Panda ou o ID do vídeo. Deixe vazio para mostrar “Vídeo em
                    breve”.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`new-block-${block.key}-note`}>Anotação para este vídeo</Label>
                    <Textarea
                      className="min-h-24"
                      id={`new-block-${block.key}-note`}
                      maxLength={3000}
                      name={`newBlock:${newContentIndex(index)}:note`}
                    />
                  </div>
                </>
              ) : (
                <MediaUpload
                  kind={block.kind}
                  lessonId={lesson.id}
                  attachmentTargets={attachmentTargets}
                  onUploaded={() => {
                    setNewBlocks((blocks) => blocks.filter((item) => item.key !== block.key));
                    setUploadNotice(
                      block.kind === 'image'
                        ? 'A imagem foi adicionada à aula.'
                        : 'O arquivo foi adicionado à aula.',
                    );
                    router.refresh();
                  }}
                />
              )}
              <Button
                aria-label={removeBlockLabel[block.kind]}
                className="w-fit"
                onClick={() =>
                  setNewBlocks((blocks) => blocks.filter((item) => item.key !== block.key))
                }
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" />
                Remover
              </Button>
            </fieldset>
          ))}

          {uploadNotice ? <p className="text-body text-foreground">{uploadNotice}</p> : null}
          <LiveRegion>{uploadNotice}</LiveRegion>

          {/* Sempre presente: regiões criadas junto com o texto costumam não ser anunciadas. */}
          <LiveRegion>{state.saved ? state.message : null}</LiveRegion>
          {state.message ? (
            state.saved ? (
              <p className="text-body text-foreground">{state.message}</p>
            ) : (
              <p className="text-body text-destructive" role="alert">
                {state.message}
              </p>
            )
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button loading={pending} loadingText="Salvando…" type="submit">
              <Save aria-hidden="true" />
              Salvar alterações
            </Button>
            <Button onClick={onCancel} type="button" variant="soft">
              <X aria-hidden="true" data-icon="inline-start" />
              Cancelar
            </Button>
          </div>
        </div>
      </form>
      <div className={cn('self-start xl:sticky xl:top-10', !showPreview && 'hidden xl:block')}>
        <LessonDraftPreview
          currentLessonId={lesson.id}
          siblingLessons={siblingLessons}
          title={previewChanged ? draft.title : lesson.title}
          description={previewChanged ? draft.description : (lesson.description ?? '')}
          changed={previewChanged}
          blocks={previewBlocks}
        />
      </div>
    </div>
  );
}

function AttachmentSelect({
  defaultValue,
  id,
  name,
  targets,
  onChange,
}: {
  defaultValue?: string;
  id: string;
  name?: string;
  targets: EditableBlock[];
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Este arquivo acompanha</Label>
      <Select
        defaultValue={defaultValue}
        id={id}
        name={name}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
      >
        <option value="">A aula inteira</option>
        {targets.map((target, index) => (
          <option key={target.id} value={target.id}>
            {target.kind === 'link'
              ? target.data.label || `Link ${index + 1}`
              : `Vídeo ${index + 1}`}
          </option>
        ))}
      </Select>
    </div>
  );
}

function MediaUpload({
  blockId,
  altFieldName,
  initialAlt,
  kind,
  lessonId,
  attachmentTargets = [],
  onUploaded,
}: {
  blockId?: string;
  altFieldName?: string;
  initialAlt?: string;
  kind: 'image' | 'file';
  lessonId: string;
  attachmentTargets?: EditableBlock[];
  onUploaded: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState(initialAlt ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [attachToBlockId, setAttachToBlockId] = useState('');

  async function upload() {
    if (!file) {
      setMessage('Escolha um arquivo primeiro.');
      return;
    }
    if (kind === 'image' && !alt.trim()) {
      setMessage('Escreva uma descrição para a imagem.');
      return;
    }

    setBusy(true);
    setMessage('');
    const form = new FormData();
    form.set('lessonId', lessonId);
    form.set('kind', kind);
    form.set('file', file);
    if (blockId) form.set('replaceBlockId', blockId);
    if (kind === 'image') form.set('alt', alt);
    if (kind === 'file' && !blockId && attachToBlockId)
      form.set('attachToBlockId', attachToBlockId);

    try {
      const response = await fetch('/api/admin/learning-content/media', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(result?.message ?? 'Não consegui guardar o material. Tente de novo.');
        return;
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setMessage(blockId ? 'O material foi atualizado.' : 'O material foi adicionado à aula.');
      onUploaded();
    } catch {
      setMessage('Não consegui guardar o material. Confira a internet e tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 forced-colors:border forced-colors:border-[CanvasText]">
      {kind === 'image' ? (
        <FloatingLabelInput
          id={`${inputId}-alt`}
          label="Descrição da imagem"
          maxLength={300}
          name={altFieldName}
          onChange={(event) => setAlt(event.currentTarget.value)}
          // Só a imagem já salva tem a descrição no "Salvar alterações". Na nova, o campo
          // obrigatório travaria o formulário da aula inteira; o envio confere sozinho.
          required={Boolean(altFieldName)}
          value={alt}
        />
      ) : null}
      {kind === 'file' && !blockId ? (
        <AttachmentSelect
          id={`${inputId}-attached-to`}
          targets={attachmentTargets}
          onChange={setAttachToBlockId}
        />
      ) : null}
      <FileField
        accept={
          kind === 'image'
            ? 'image/png,image/jpeg,image/webp'
            : '.pdf,.zip,.docx,.xlsx,.pptx,.txt,.csv'
        }
        buttonLabel={kind === 'image' ? 'Escolher imagem' : 'Escolher arquivo'}
        file={file}
        hint={
          kind === 'image'
            ? 'PNG, JPG ou WebP. Até 20 MB.'
            : 'PDF, ZIP, DOCX, XLSX, PPTX, TXT ou CSV. Até 20 MB.'
        }
        id={inputId}
        inputRef={inputRef}
        label={kind === 'image' ? 'Imagem' : 'Arquivo'}
        onFile={(chosen) => {
          setFile(chosen);
          setMessage('');
        }}
      />
      {message ? <p className="text-body text-foreground">{message}</p> : null}
      <LiveRegion>{message}</LiveRegion>
      <Button
        className="w-fit"
        loading={busy}
        loadingText="Enviando…"
        onClick={upload}
        type="button"
      >
        <Upload aria-hidden="true" />
        {blockId ? 'Trocar material' : 'Enviar material'}
      </Button>
    </div>
  );
}

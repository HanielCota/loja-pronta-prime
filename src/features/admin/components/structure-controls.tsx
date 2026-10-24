'use client';

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminConfirmation } from './admin-confirmation';
import {
  Archive,
  Ellipsis,
  ArrowDown,
  ArrowUp,
  FilePenLine,
  FileX,
  History,
  ImagePlus,
  Pencil,
  RotateCcw,
  Save,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  archiveLearningNode,
  moveLearningNode,
  restoreLearningNode,
  saveLearningNode,
  setLearningNodePublication,
  setFeaturedCourse,
  publishNodeDraft,
  discardNodeDraft,
  restorePreviousNodeVersion,
} from '../server/actions';
import type {
  ArchivedLearningNode,
  EditableLearningNode,
  LearningNodeKind,
  StructureActionState,
} from '../structure-types';
import { SelectMenu as Select } from '@/components/ui/select-menu';
import { Textarea } from '@/components/ui/textarea';
import { FileField } from '@/components/ui/file-field';

const initialState: StructureActionState = { message: '', saved: false };

const kindLabel: Record<LearningNodeKind, string> = {
  track: 'trilha',
  stage: 'etapa',
  module: 'módulo',
  lesson: 'aula',
};

export function ContentNodeForm({
  kind,
  parentId,
  initial,
  defaultTrackKind,
  lessonChoices = [],
  onCancel,
}: {
  kind: LearningNodeKind;
  parentId?: string;
  initial?: EditableLearningNode;
  defaultTrackKind?: 'welcome' | 'method' | 'complementary_course';
  lessonChoices?: Array<{ id: string; title: string }>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveLearningNode, initialState);
  const formKindLabel =
    kind === 'track' && (initial?.trackKind ?? defaultTrackKind) === 'complementary_course'
      ? 'curso'
      : kind === 'track'
        ? 'conteúdo'
        : kindLabel[kind];
  const [preview, setPreview] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    duration: initial?.durationMinutes ? String(initial.durationMinutes) : '',
  });
  const [dirty, setDirty] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // O formulário substitui a lista: sem isto, o foco cairia no início da página.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  // O erro fica ligado ao campo que o causou. Erros sem campo (item indisponível, local
  // inválido) só aparecem no aviso: marcar o nome como errado confundiria o leitor de tela.
  const errorId = 'learning-node-error';
  const errorField = state.message && !state.saved ? (state.field ?? null) : null;
  const describedBy = (field: NonNullable<typeof errorField>) =>
    errorField === field ? { 'aria-describedby': errorId, 'aria-invalid': true } : {};

  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const values = new FormData(event.currentTarget);
    setPreview({
      title: String(values.get('title') ?? ''),
      description: String(values.get('description') ?? ''),
      duration: String(values.get('durationMinutes') ?? ''),
    });
    setDirty(true);
  }

  useEffect(() => {
    if (state.saved) {
      onCancel();
      router.refresh();
    }
  }, [onCancel, router, state.saved]);

  return (
    <div className="mt-4 grid items-start gap-6 xl:grid-cols-2">
      <form
        noValidate
        action={formAction}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 forced-colors:border forced-colors:border-[CanvasText]"
        onChange={updatePreview}
        onInput={updatePreview}
      >
        <h3
          className="rounded-xl text-title font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          ref={headingRef}
          tabIndex={-1}
        >
          {initial
            ? `Editar ${formKindLabel}`
            : kind === 'track' && defaultTrackKind === 'complementary_course'
              ? 'Adicionar curso'
              : `Adicionar ${formKindLabel}`}
        </h3>
        <input name="kind" type="hidden" value={kind} />
        {initial ? <input name="nodeId" type="hidden" value={initial.id} /> : null}
        {parentId ? <input name="parentId" type="hidden" value={parentId} /> : null}
        {kind === 'track' && defaultTrackKind ? (
          <input name="trackKind" type="hidden" value={initial?.trackKind ?? defaultTrackKind} />
        ) : kind === 'track' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="learning-track-kind">Tipo da trilha</Label>
            <Select
              defaultValue={initial?.trackKind ?? defaultTrackKind ?? 'method'}
              id="learning-track-kind"
              name="trackKind"
            >
              <option value="welcome">Boas-vindas</option>
              <option value="method">Método SLL</option>
              <option value="complementary_course">Curso complementar</option>
            </Select>
          </div>
        ) : null}
        <FloatingLabelInput
          defaultValue={initial?.title ?? ''}
          id="learning-node-title"
          label={kind === 'lesson' ? 'Título da aula' : 'Nome'}
          maxLength={160}
          name="title"
          required
          {...describedBy('title')}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="learning-node-description">Descrição (opcional)</Label>
          <Textarea
            className="min-h-24"
            defaultValue={initial?.description ?? ''}
            id="learning-node-description"
            maxLength={1200}
            name="description"
            {...describedBy('description')}
          />
        </div>
        {kind === 'track' && initial?.trackKind === 'complementary_course' ? (
          <CourseCoverUpload course={initial} />
        ) : null}
        {kind === 'lesson' ? (
          <>
            {defaultTrackKind === 'method' || lessonChoices.length ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="related-lesson">Aula relacionada (opcional)</Label>
                <Select
                  defaultValue={initial?.relatedLessonId ?? ''}
                  id="related-lesson"
                  name="relatedLessonId"
                  {...describedBy('relatedLessonId')}
                >
                  <option value="">Nenhuma aula relacionada</option>
                  {/* A aula ligada pode ter sido arquivada: sem esta opção, a lista mostraria
                      "Nenhuma" e salvar apagaria o vínculo sem a admin pedir. */}
                  {initial?.relatedLessonId &&
                  !lessonChoices.some((choice) => choice.id === initial.relatedLessonId) ? (
                    <option value={initial.relatedLessonId}>
                      Aula indisponível (vínculo mantido)
                    </option>
                  ) : null}
                  {lessonChoices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.title}
                    </option>
                  ))}
                </Select>
                <p className="text-body text-muted-foreground">
                  Se esta ação tiver uma aula completa, escolha qual abrir para a aluna.
                </p>
              </div>
            ) : null}
            <FloatingLabelInput
              defaultValue={initial?.durationMinutes ?? ''}
              id="learning-node-duration"
              label="Duração em minutos (opcional)"
              max={999}
              min={1}
              name="durationMinutes"
              type="number"
              {...describedBy('durationMinutes')}
            />
            <label className="flex min-h-11 items-center gap-3 text-body text-foreground">
              <input
                defaultChecked={initial?.countsTowardProgress ?? true}
                name="countsTowardProgress"
                type="checkbox"
                value="true"
              />
              Conta no progresso principal
            </label>
          </>
        ) : null}
        {state.message ? (
          <p className="text-body text-destructive" id={errorId} role="alert">
            {state.message}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button loading={pending} loadingText="Salvando…" type="submit">
            <Save aria-hidden="true" data-icon="inline-start" />
            Salvar
          </Button>
          <Button className="!w-full" onClick={onCancel} type="button" variant="soft">
            <X aria-hidden="true" data-icon="inline-start" />
            Cancelar
          </Button>
        </div>
      </form>
      <section
        aria-label="Prévia para alunas"
        className="rounded-2xl border border-border bg-background p-5"
      >
        <p className="text-body font-semibold text-foreground">
          Prévia para alunas{' '}
          {dirty ? '· alterações não salvas' : initial?.hasDraft ? '· rascunho salvo' : ''}
        </p>
        <div className="mt-4 rounded-2xl bg-card p-5 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          {kind === 'track' && initial?.trackKind === 'complementary_course' ? (
            initial.coverStorageKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={initial.coverAlt ?? ''}
                className="mb-4 aspect-video w-full rounded-2xl object-cover"
                src={`/api/sll/course-cover/${initial.id}?preview=1`}
              />
            ) : (
              <div className="mb-4 flex aspect-video items-center justify-center rounded-2xl bg-muted text-body text-muted-foreground">
                Capa ainda não enviada
              </div>
            )
          ) : null}
          <h4 className="text-title font-semibold text-balance text-foreground">
            {preview.title || 'O nome aparece aqui'}
          </h4>
          {preview.description ? (
            <p className="mt-2 text-body text-pretty text-muted-foreground">
              {preview.description}
            </p>
          ) : null}
          {kind === 'lesson' && preview.duration ? (
            <p className="mt-3 text-body text-muted-foreground">{preview.duration} min</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CourseCoverUpload({ course }: { course: EditableLearningNode }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState(course.coverAlt ?? '');
  const [hasCover, setHasCover] = useState(Boolean(course.coverStorageKey));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function changeCover(remove = false) {
    if (!remove && (!file || !alt.trim())) {
      setMessage('Escolha uma imagem e descreva o que ela mostra.');
      return;
    }
    setBusy(true);
    setMessage('');
    const data = new FormData();
    if (file) data.set('file', file);
    data.set('alt', alt);
    try {
      const response = await fetch(`/api/sll/course-cover/${course.id}`, {
        method: remove ? 'DELETE' : 'POST',
        ...(remove ? {} : { body: data }),
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(result?.message ?? 'Não consegui alterar a capa.');
      if (response.ok) {
        setHasCover(!remove);
        setFile(null);
        router.refresh();
      }
    } catch {
      setMessage('Confira a internet e tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <h4 className="text-body font-semibold text-foreground">Capa do curso</h4>
      {hasCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          className="aspect-video w-full max-w-lg rounded-2xl object-cover"
          src={`/api/sll/course-cover/${course.id}?preview=1`}
        />
      ) : (
        <p className="text-body text-muted-foreground">Este curso ainda não tem capa.</p>
      )}
      <FileField
        accept="image/png,image/jpeg,image/webp"
        buttonLabel="Escolher imagem"
        file={file}
        id={`course-cover-${course.id}`}
        label="Imagem da capa"
        onFile={setFile}
      />
      <FloatingLabelInput
        id={`course-cover-alt-${course.id}`}
        label="Descrição da capa"
        maxLength={300}
        onChange={(event) => setAlt(event.currentTarget.value)}
        value={alt}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          className="!w-fit"
          disabled={busy || !file}
          onClick={() => changeCover()}
          type="button"
          variant="soft"
        >
          <ImagePlus aria-hidden="true" />
          Trocar capa
        </Button>
        {hasCover ? (
          <Button
            className="!w-fit"
            disabled={busy}
            onClick={() => changeCover(true)}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
            Remover capa
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-body text-muted-foreground">{message}</p> : null}
      {/* Sempre presente: regiões criadas junto com o texto costumam não ser anunciadas. */}
      <LiveRegion>{message}</LiveRegion>
    </div>
  );
}

export function LearningNodeControls({
  kind,
  node,
  parentId,
  trackKind,
  first,
  last,
  onEdit,
}: {
  kind: LearningNodeKind;
  node: EditableLearningNode;
  parentId?: string;
  trackKind?: 'welcome' | 'method' | 'complementary_course';
  first: boolean;
  last: boolean;
  onEdit: (node: EditableLearningNode) => void;
}) {
  // A lista devolve o foco a este botão ao fechar o formulário (Salvar, Cancelar, Voltar).
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean }>({
    text: '',
    error: false,
  });
  const published = node.status === 'published';
  const confirmation = useAdminConfirmation();

  function showResult(result: { message: string; saved: boolean }) {
    setMessage({ text: result.message, error: !result.saved });
    if (result.saved) router.refresh();
  }

  function run(
    action: typeof archiveLearningNode | typeof moveLearningNode,
    values: Record<string, string>,
  ) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    if (trackKind) data.set('trackKind', trackKind);
    startTransition(async () => {
      const result = await action(data);
      showResult(result);
    });
  }

  async function archive() {
    if (
      !(await confirmation.ask({
        title: `Arquivar “${node.title}”?`,
        description: 'O conteúdo e os materiais ficam guardados e podem ser restaurados.',
        confirmLabel: 'Arquivar',
      }))
    )
      return;
    run(archiveLearningNode, { kind, nodeId: node.id });
  }

  function changePublication() {
    const data = new FormData();
    data.set('kind', kind);
    data.set('nodeId', node.id);
    data.set('status', published ? 'draft' : 'published');
    startTransition(async () => {
      const result =
        published && node.hasDraft
          ? await publishNodeDraft(data)
          : await setLearningNodePublication(data);
      showResult(result);
    });
  }

  async function discardDraft() {
    if (
      !(await confirmation.ask({
        title: 'Descartar rascunho?',
        description: `As alterações de “${node.title}” serão descartadas. A versão publicada continua visível.`,
        confirmLabel: 'Descartar rascunho',
      }))
    )
      return;
    const data = new FormData();
    data.set('kind', kind);
    data.set('nodeId', node.id);
    startTransition(async () => {
      const result = await discardNodeDraft(data);
      showResult(result);
    });
  }

  async function restoreVersion() {
    if (
      !(await confirmation.ask({
        title: 'Restaurar versão anterior?',
        description: `“${node.title}” volta aos textos da versão anterior.`,
        confirmLabel: 'Restaurar versão',
      }))
    )
      return;
    const data = new FormData();
    data.set('kind', kind);
    data.set('nodeId', node.id);
    startTransition(async () => {
      const result = await restorePreviousNodeVersion(data);
      showResult(result);
    });
  }

  function changeFeatured() {
    const data = new FormData();
    data.set('nodeId', node.id);
    startTransition(async () => {
      const result = await setFeaturedCourse(data);
      showResult(result);
    });
  }

  return (
    <div className="mt-2 flex items-start gap-2 pl-13">
      {confirmation.dialog}
      <Button
        aria-label={`Editar ${node.title}`}
        className="!w-fit !px-4"
        data-edit-node={node.id}
        onClick={() => onEdit(node)}
        type="button"
        variant="soft"
      >
        <Pencil aria-hidden="true" data-icon="inline-start" />
        Editar
      </Button>
      <details className="min-w-0 flex-1 sm:flex-none sm:open:flex-1">
        <summary
          aria-label={`Mais opções para ${node.title}`}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-body text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150"
        >
          <Ellipsis aria-hidden="true" className="size-5" />
          Mais opções
        </summary>
        <div className="flex flex-col gap-2 border-t border-border py-3 sm:flex-row sm:flex-wrap">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              aria-label={`Mover ${node.title} para cima`}
              className="!w-full !px-3 sm:!w-fit"
              disabled={first || pending}
              onClick={() =>
                run(moveLearningNode, {
                  kind,
                  nodeId: node.id,
                  parentId: parentId ?? '',
                  direction: 'up',
                })
              }
              type="button"
              variant="soft"
            >
              <ArrowUp aria-hidden="true" />
              Subir
            </Button>
            <Button
              aria-label={`Mover ${node.title} para baixo`}
              className="!w-full !px-3 sm:!w-fit"
              disabled={last || pending}
              onClick={() =>
                run(moveLearningNode, {
                  kind,
                  nodeId: node.id,
                  parentId: parentId ?? '',
                  direction: 'down',
                })
              }
              type="button"
              variant="soft"
            >
              <ArrowDown aria-hidden="true" />
              Descer
            </Button>
          </div>
          <Button
            aria-label={
              published && node.hasDraft
                ? `Publicar alterações de ${node.title}`
                : published
                  ? `Despublicar ${node.title}`
                  : `Publicar ${node.title}`
            }
            className="!w-full !px-3 sm:!w-fit"
            disabled={pending}
            onClick={changePublication}
            type="button"
            variant={published ? 'ghost' : 'soft'}
          >
            {published && !node.hasDraft ? (
              <FilePenLine aria-hidden="true" data-icon="inline-start" />
            ) : (
              <Send aria-hidden="true" data-icon="inline-start" />
            )}
            {published && node.hasDraft
              ? 'Publicar alterações'
              : published
                ? 'Voltar para rascunho'
                : 'Publicar'}
          </Button>
          {node.hasDraft ? (
            <Button
              className="!w-full !px-3 sm:!w-fit"
              disabled={pending}
              onClick={discardDraft}
              type="button"
              variant="ghost"
            >
              <FileX aria-hidden="true" data-icon="inline-start" />
              Descartar rascunho
            </Button>
          ) : null}
          {node.hasHistory && !node.hasDraft ? (
            <Button
              className="!w-full !px-3 sm:!w-fit"
              disabled={pending}
              onClick={restoreVersion}
              type="button"
              variant="ghost"
            >
              <History aria-hidden="true" data-icon="inline-start" />
              Versão anterior
            </Button>
          ) : null}
          <Button
            aria-label={`Arquivar ${node.title}`}
            className="!w-full !px-3 sm:!w-fit"
            disabled={pending}
            onClick={archive}
            type="button"
            variant="ghost"
          >
            <Archive aria-hidden="true" />
            Arquivar
          </Button>
          {kind === 'track' && trackKind === 'complementary_course' ? (
            <Button
              aria-label={
                node.featured ? `Remover ${node.title} do destaque` : `Destacar ${node.title}`
              }
              className="!w-full !px-3 sm:!w-fit"
              disabled={pending}
              onClick={changeFeatured}
              type="button"
              variant="soft"
            >
              <Star aria-hidden="true" data-icon="inline-start" />
              {node.featured ? 'Remover destaque' : 'Destacar curso'}
            </Button>
          ) : null}
        </div>
      </details>
      {message.text ? (
        <span
          className={cn('text-body', message.error ? 'text-destructive' : 'text-muted-foreground')}
          role={message.error ? 'alert' : undefined}
        >
          {message.text}
        </span>
      ) : null}
      {/* Sempre presente: regiões criadas junto com o texto costumam não ser anunciadas. */}
      <LiveRegion>{message.text}</LiveRegion>
    </div>
  );
}

export function ArchivedLearningContent({
  items,
  initiallyOpen = false,
  standalone = false,
}: {
  items: ArchivedLearningNode[];
  initiallyOpen?: boolean;
  standalone?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function restore(item: ArchivedLearningNode) {
    const data = new FormData();
    data.set('kind', item.kind);
    data.set('nodeId', item.id);
    setPendingId(item.id);
    // Sem conexão (ou com erro no servidor), o botão volta a funcionar e a pessoa sabe o motivo.
    try {
      const result = await restoreLearningNode(data);
      setMessage(result.message);
      if (result.saved) router.refresh();
    } catch {
      setMessage('Não consegui restaurar. Confira a internet e tente de novo.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className={standalone ? '' : 'mt-5 border-t border-border pt-4'}>
      <Button
        aria-expanded={open}
        className="!w-fit !px-4"
        onClick={() => setOpen((value) => !value)}
        type="button"
        variant="ghost"
      >
        <Archive aria-hidden="true" data-icon="inline-start" />
        {standalone ? 'Aulas e cursos' : `Itens arquivados (${items.length})`}
      </Button>
      {open ? (
        items.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {items.map((item) => (
              <li
                className="flex flex-col gap-2 rounded-2xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={item.id}
              >
                <span className="text-body text-foreground">
                  {item.title}{' '}
                  <span className="text-muted-foreground">· {kindLabel[item.kind]}</span>
                </span>
                <Button
                  className="!w-full !px-4 sm:!w-fit"
                  disabled={pendingId === item.id}
                  onClick={() => restore(item)}
                  type="button"
                  variant="soft"
                >
                  <RotateCcw aria-hidden="true" />
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-body text-muted-foreground">Nenhum item arquivado.</p>
        )
      ) : null}
      {message ? <p className="mt-2 text-body text-muted-foreground">{message}</p> : null}
      <LiveRegion>{message}</LiveRegion>
    </section>
  );
}

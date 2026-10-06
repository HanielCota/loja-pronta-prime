'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import {
  archiveLearningNode,
  moveLearningNode,
  restoreLearningNode,
  saveLearningNode,
  setLearningNodePublication,
} from '../server/actions';
import type {
  ArchivedLearningNode,
  EditableLearningNode,
  LearningNodeKind,
  StructureActionState,
} from '../structure-types';

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
  onCancel,
}: {
  kind: LearningNodeKind;
  parentId?: string;
  initial?: EditableLearningNode;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveLearningNode, initialState);

  useEffect(() => {
    if (state.saved) {
      onCancel();
      router.refresh();
    }
  }, [onCancel, router, state.saved]);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 forced-colors:border forced-colors:border-[CanvasText]"
    >
      <h3 className="text-title font-semibold text-foreground">
        {initial ? `Editar ${kindLabel[kind]}` : `Adicionar ${kindLabel[kind]}`}
      </h3>
      <input name="kind" type="hidden" value={kind} />
      {initial ? <input name="nodeId" type="hidden" value={initial.id} /> : null}
      {parentId ? <input name="parentId" type="hidden" value={parentId} /> : null}
      {kind === 'track' ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="learning-track-kind">Tipo da trilha</Label>
          <select
            className="min-h-12 w-full rounded-field border border-input bg-background px-4 text-body text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={initial?.trackKind ?? 'method'}
            id="learning-track-kind"
            name="trackKind"
          >
            <option value="welcome">Boas-vindas</option>
            <option value="method">Método SLL</option>
            <option value="complementary_course">Curso complementar</option>
          </select>
        </div>
      ) : null}
      <FloatingLabelInput
        defaultValue={initial?.title ?? ''}
        id="learning-node-title"
        label={kind === 'lesson' ? 'Título da aula' : 'Nome'}
        maxLength={160}
        name="title"
        required
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="learning-node-description">Descrição (opcional)</Label>
        <textarea
          className="min-h-24 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          defaultValue={initial?.description ?? ''}
          id="learning-node-description"
          maxLength={1200}
          name="description"
        />
      </div>
      {kind === 'lesson' ? (
        <>
          <FloatingLabelInput
            defaultValue={initial?.durationMinutes ?? ''}
            id="learning-node-duration"
            label="Duração em minutos (opcional)"
            max={999}
            min={1}
            name="durationMinutes"
            type="number"
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
        <p className="text-body text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button loading={pending} loadingText="Salvando…" type="submit">
          Salvar
        </Button>
        <Button className="!w-full" onClick={onCancel} type="button" variant="soft">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function LearningNodeControls({
  kind,
  node,
  parentId,
  first,
  last,
  onEdit,
}: {
  kind: LearningNodeKind;
  node: EditableLearningNode;
  parentId?: string;
  first: boolean;
  last: boolean;
  onEdit: (node: EditableLearningNode) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const published = node.status === 'published';

  function run(
    action: typeof archiveLearningNode | typeof moveLearningNode,
    values: Record<string, string>,
  ) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    startTransition(async () => {
      const result = await action(data);
      setMessage(result.message);
      if (result.saved) router.refresh();
    });
  }

  function archive() {
    const confirmation = window.confirm(
      `Arquivar “${node.title}”? O conteúdo e os materiais ficam guardados e podem ser restaurados.`,
    );
    if (!confirmation) return;
    run(archiveLearningNode, { kind, nodeId: node.id });
  }

  function changePublication() {
    const data = new FormData();
    data.set('kind', kind);
    data.set('nodeId', node.id);
    data.set('status', published ? 'draft' : 'published');
    startTransition(async () => {
      const result = await setLearningNodePublication(data);
      setMessage(result.message);
      if (result.saved) router.refresh();
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 pl-2 sm:flex-row sm:items-center">
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button
          aria-label={`Subir ${node.title}`}
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
          aria-label={`Descer ${node.title}`}
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
        aria-label={`Editar ${node.title}`}
        className="!w-full !px-3 sm:!w-fit"
        onClick={() => onEdit(node)}
        type="button"
        variant="ghost"
      >
        Editar
      </Button>
      <Button
        aria-label={published ? `Voltar para rascunho: ${node.title}` : `Publicar ${node.title}`}
        className="!w-full !px-3 sm:!w-fit"
        disabled={pending}
        onClick={changePublication}
        type="button"
        variant={published ? 'ghost' : 'soft'}
      >
        {published ? 'Voltar para rascunho' : 'Publicar'}
      </Button>
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
      {message ? <span className="text-body text-muted-foreground">{message}</span> : null}
      <LiveRegion>{message}</LiveRegion>
    </div>
  );
}

export function ArchivedLearningContent({ items }: { items: ArchivedLearningNode[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function restore(item: ArchivedLearningNode) {
    const data = new FormData();
    data.set('kind', item.kind);
    data.set('nodeId', item.id);
    setPendingId(item.id);
    const result = await restoreLearningNode(data);
    setMessage(result.message);
    setPendingId(null);
    if (result.saved) router.refresh();
  }

  return (
    <section className="mt-5 border-t border-border pt-4">
      <Button
        aria-expanded={open}
        className="!w-fit !px-4"
        onClick={() => setOpen((value) => !value)}
        type="button"
        variant="ghost"
      >
        Itens arquivados ({items.length})
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

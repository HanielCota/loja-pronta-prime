'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical, Pencil } from 'lucide-react';
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SllResourceEditor } from './sll-resource-editor';
import { reorderSllResourcesForm } from '../server/actions';

type Resource = NonNullable<Parameters<typeof SllResourceEditor>[0]['resource']>;

function SortableResource({
  resource,
  selected,
  onSelect,
}: {
  resource: Resource;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({ id: resource.id });
  return (
    <li
      className={isDragging ? 'relative z-10' : 'relative'}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
    >
      <div
        className={`flex items-center gap-2 rounded-2xl border p-2 ${selected ? 'border-primary bg-primary-soft' : 'border-border bg-card'}`}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${resource.title} para mudar a ordem`}
          className="inline-flex min-h-11 min-w-11 touch-none items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          ref={setActivatorNodeRef}
          type="button"
        >
          <GripVertical aria-hidden="true" className="size-5" />
        </button>
        <button
          aria-current={selected ? 'true' : undefined}
          className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-3 text-left text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={onSelect}
          type="button"
        >
          <span className="min-w-0">
            <span className="block font-semibold">{resource.draft?.title ?? resource.title}</span>
            <span className="block text-sm text-muted-foreground">
              {resource.status === 'published' ? 'Publicado' : 'Não publicado'}
              {resource.draft ? ' · Rascunho salvo' : ''}
            </span>
          </span>
          <Pencil aria-hidden="true" className="size-5 shrink-0 text-link" />
        </button>
      </div>
    </li>
  );
}

export function SllResourceList({
  groupKey,
  groupTitle,
  resources,
  lessonOptions,
}: {
  groupKey: string;
  groupTitle: string;
  resources: Resource[];
  lessonOptions: Array<{ id: string; trackId: string; trackTitle: string; title: string }>;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(() => resources.map((resource) => resource.id));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  const completeOrder = [
    ...order.filter((id) => byId.has(id)),
    ...resources.filter((resource) => !order.includes(resource.id)).map((resource) => resource.id),
  ];
  const sorted = completeOrder
    .map((id) => byId.get(id))
    .filter((resource): resource is Resource => Boolean(resource));
  const selectedResource = selectedId ? byId.get(selectedId) : undefined;

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || pending) return;
    const from = completeOrder.indexOf(String(active.id));
    const to = completeOrder.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const previous = completeOrder;
    const next = arrayMove(completeOrder, from, to);
    setOrder(next);
    const data = new FormData();
    data.set('groupKey', groupKey);
    next.forEach((id) => data.append('id', id));
    startTransition(async () => {
      const result = await reorderSllResourcesForm(data);
      setMessage(result.message);
      if (result.saved) router.refresh();
      else setOrder(previous);
    });
  }

  return (
    <section aria-label={groupTitle}>
      <h2 className="mb-3 text-title font-semibold text-foreground">{groupTitle}</h2>
      {resources.length > 1 ? (
        <p className="mb-3 text-body text-muted-foreground">
          Arraste para mudar a ordem. Pelo teclado, use Espaço e as setas.
        </p>
      ) : null}
      <DndContext
        id={`sll-resources-${groupKey}`}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        sensors={sensors}
      >
        <SortableContext items={completeOrder} strategy={rectSortingStrategy}>
          <ul aria-busy={pending} className="grid items-start gap-3">
            {sorted.map((resource) => (
              <SortableResource
                selected={selectedId === resource.id}
                onSelect={() => setSelectedId(selectedId === resource.id ? null : resource.id)}
                key={resource.id}
                resource={resource}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {selectedResource ? (
        <div className="mt-5" id={`resource-editor-${groupKey}`}>
          <SllResourceEditor
            key={JSON.stringify(selectedResource)}
            isFirst={sorted[0]?.id === selectedId}
            isLast={sorted.at(-1)?.id === selectedId}
            lessonOptions={lessonOptions}
            resource={selectedResource}
          />
        </div>
      ) : null}
      {message ? (
        <output aria-live="polite" className="mt-3 block text-body text-muted-foreground">
          {message}
        </output>
      ) : null}
    </section>
  );
}

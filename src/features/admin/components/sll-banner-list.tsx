'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical, Pencil, Plus } from 'lucide-react';
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
import { EditorActionMessage, useEditorActions } from './editor-actions';
import { SllBannerEditor } from './sll-banner-editor';
import { reorderSllBannersForm, runSllBannerActionForm } from '../server/actions';

type Banner = Parameters<typeof SllBannerEditor>[0]['banner'];

function SortableBanner({
  banner,
  selected,
  onSelect,
}: {
  banner: NonNullable<Banner>;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({ id: banner.id });
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
          aria-label={`Arrastar banner ${banner.title} para mudar a ordem`}
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
            <span className="block font-semibold">{banner.draft?.title ?? banner.title}</span>
            <span className="block text-sm text-muted-foreground">
              {banner.status === 'published' ? 'Publicado' : 'Não publicado'}
              {banner.draft ? ' · Rascunho salvo' : ''}
            </span>
          </span>
          <Pencil aria-hidden="true" className="size-5 shrink-0 text-link" />
        </button>
      </div>
    </li>
  );
}

export function SllBannerList({ banners }: { banners: NonNullable<Banner>[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(() => banners.map((banner) => banner.id));
  // A ordem salva no servidor manda: depois de "Mover para cima/baixo" ou de um arrasto, a
  // lista nova chega por aqui. Sem isso, a ordem antiga guardada no estado continuaria na tela.
  const serverOrder = banners.map((banner) => banner.id).join(':');
  const [seenServerOrder, setSeenServerOrder] = useState(serverOrder);
  if (seenServerOrder !== serverOrder) {
    setSeenServerOrder(serverOrder);
    setOrder(banners.map((banner) => banner.id));
  }
  const {
    run,
    pending: actionPending,
    revision,
    message,
    setMessage,
    messageRef,
  } = useEditorActions(runSllBannerActionForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(banners.map((banner) => [banner.id, banner]));
  const completeOrder = [
    ...order.filter((id) => byId.has(id)),
    ...banners.filter((banner) => !order.includes(banner.id)).map((banner) => banner.id),
  ];
  const sorted = completeOrder
    .map((id) => byId.get(id))
    .filter((banner): banner is NonNullable<Banner> => Boolean(banner));
  const selectedBanner = selectedId ? byId.get(selectedId) : undefined;

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || pending) return;
    const from = completeOrder.indexOf(String(active.id));
    const to = completeOrder.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const previous = completeOrder;
    const next = arrayMove(completeOrder, from, to);
    setOrder(next);
    const form = new FormData();
    next.forEach((id) => form.append('id', id));
    startTransition(async () => {
      const result = await reorderSllBannersForm(form);
      setMessage({ text: result.message, error: !result.saved, focus: false });
      if (result.saved) {
        router.refresh();
        return;
      }
      setOrder(previous);
    });
  }

  return (
    <>
      {banners.length > 1 ? (
        <p className="mb-4 text-body text-muted-foreground">
          Arraste um banner para trocar a ordem. Pelo teclado, use Espaço e as setas.
        </p>
      ) : null}
      <DndContext
        id="sll-banners"
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        sensors={sensors}
      >
        <SortableContext items={completeOrder} strategy={rectSortingStrategy}>
          <ul aria-busy={pending} className="grid items-start gap-3">
            {sorted.map((banner) => (
              <SortableBanner
                banner={banner}
                selected={selectedId === banner.id}
                onSelect={() => setSelectedId(selectedId === banner.id ? null : banner.id)}
                key={banner.id}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {selectedBanner ? (
        <div className="mt-5">
          <SllBannerEditor
            // Recarrega só quando os valores salvos mudam (publicar, descartar, voltar). Salvar ou
            // mover mantém o formulário e o foco onde estão.
            key={`${selectedBanner.id}:${revision}`}
            action={run}
            actionPending={actionPending}
            banner={selectedBanner}
            isFirst={sorted[0]?.id === selectedId}
            isLast={sorted.at(-1)?.id === selectedId}
          />
        </div>
      ) : null}
      <EditorActionMessage className="mt-4" message={message} messageRef={messageRef} />
      <section aria-label="Adicionar banner" className="mt-8 max-w-2xl">
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-body font-semibold text-link outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Plus aria-hidden="true" className="size-5" />
            Adicionar banner
          </summary>
          <div className="mt-4">
            {/* Novo a cada banner criado (não a cada troca de ordem): o cartão limpa e volta a
                criar outro. */}
            <SllBannerEditor
              key={banners
                .map((banner) => banner.id)
                .toSorted()
                .join(':')}
            />
          </div>
        </details>
      </section>
    </>
  );
}

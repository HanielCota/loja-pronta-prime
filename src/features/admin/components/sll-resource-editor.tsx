'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { panelCard } from '@/features/member/components/area-shell';
import {
  archiveSllResourceForm,
  moveSllResourceForm,
  saveSllResourceForm,
} from '../server/actions';
import type { ResourceActionState } from '../structure-types';

type Resource = {
  id: string;
  groupKey: string;
  groupTitle: string;
  title: string;
  description: string;
  buttonLabel: string | null;
  destination: string | null;
  position: number;
  status: 'draft' | 'published';
};

const initialState: ResourceActionState = { message: '', saved: false };

export function SllResourceEditor({
  resource,
  isFirst = false,
  isLast = false,
}: {
  resource?: Resource;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveSllResourceForm, initialState);
  useEffect(() => {
    if (state.saved) router.refresh();
  }, [router, state.saved]);

  return (
    <article className={`${panelCard} gap-4`}>
      <form action={formAction} className="flex flex-col gap-4">
        {resource ? <input name="id" type="hidden" value={resource.id} /> : null}
        <FloatingLabelInput
          defaultValue={resource?.groupTitle ?? ''}
          id={`resource-group-title-${resource?.id ?? 'new'}`}
          label="Nome do grupo"
          maxLength={100}
          name="groupTitle"
          required
        />
        <FloatingLabelInput
          defaultValue={resource?.groupKey ?? ''}
          id={`resource-group-key-${resource?.id ?? 'new'}`}
          label="Chave do grupo (letras e hífen)"
          maxLength={60}
          name="groupKey"
          required
        />
        <FloatingLabelInput
          defaultValue={resource?.title ?? ''}
          id={`resource-title-${resource?.id ?? 'new'}`}
          label="Nome do recurso"
          maxLength={160}
          name="title"
          required
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`resource-description-${resource?.id ?? 'new'}`}>Descrição</Label>
          <textarea
            className="min-h-24 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            defaultValue={resource?.description ?? ''}
            id={`resource-description-${resource?.id ?? 'new'}`}
            maxLength={600}
            name="description"
            required
          />
        </div>
        <FloatingLabelInput
          defaultValue={resource?.buttonLabel ?? ''}
          id={`resource-button-${resource?.id ?? 'new'}`}
          label="Texto do botão (opcional)"
          maxLength={80}
          name="buttonLabel"
        />
        <FloatingLabelInput
          defaultValue={resource?.destination ?? ''}
          id={`resource-destination-${resource?.id ?? 'new'}`}
          label="Destino (vazio = Em breve)"
          maxLength={500}
          name="destination"
        />
        <FloatingLabelInput
          defaultValue={resource?.position ?? 0}
          id={`resource-position-${resource?.id ?? 'new'}`}
          label="Ordem no grupo"
          max={999}
          min={0}
          name="position"
          type="number"
          required
        />
        <label className="flex min-h-11 items-center gap-3 text-body text-foreground">
          <input
            defaultChecked={resource?.status === 'published'}
            name="published"
            type="checkbox"
            value="true"
          />{' '}
          Exibir para as alunas
        </label>
        {state.message ? (
          <p
            className={state.saved ? 'text-body text-foreground' : 'text-body text-destructive'}
            role={state.saved ? undefined : 'alert'}
          >
            {state.message}
          </p>
        ) : null}
        <LiveRegion>{state.saved ? state.message : null}</LiveRegion>
        <Button loading={pending} loadingText="Salvando…" type="submit">
          <Save aria-hidden="true" />
          Salvar recurso
        </Button>
      </form>
      {resource ? (
        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          <form action={moveSllResourceForm}>
            <input name="id" type="hidden" value={resource.id} />
            <input name="direction" type="hidden" value="up" />
            <Button
              aria-label={`Mover para cima: ${resource.title}`}
              disabled={isFirst}
              type="submit"
              variant="soft"
            >
              <ArrowUp aria-hidden="true" />
              Mover para cima
            </Button>
          </form>
          <form action={moveSllResourceForm}>
            <input name="id" type="hidden" value={resource.id} />
            <input name="direction" type="hidden" value="down" />
            <Button
              aria-label={`Mover para baixo: ${resource.title}`}
              disabled={isLast}
              type="submit"
              variant="soft"
            >
              <ArrowDown aria-hidden="true" />
              Mover para baixo
            </Button>
          </form>
          <form action={archiveSllResourceForm}>
            <input name="id" type="hidden" value={resource.id} />
            <Button type="submit" variant="soft">
              <Trash2 aria-hidden="true" />
              Arquivar recurso
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

'use client';

import { useActionState, useState, type FormEvent } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  FileX,
  History,
  Plus,
  Save,
  Send,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { panelCard } from '@/features/member/components/area-shell';
import { saveSllResourceForm } from '../server/actions';
import type { ResourceActionState } from '../structure-types';
import { AdminSelect as Select } from './admin-select';
import { Textarea } from '@/components/ui/textarea';
type ResourceDraft = {
  groupTitle?: string;
  title?: string;
  description?: string | null;
  buttonLabel?: string | null;
  destination?: string | null;
};

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
  draft?: ResourceDraft | null;
  hasHistory?: boolean;
  relatedLessonIds?: string[];
};

const initialState: ResourceActionState = { message: '', saved: false };

export function SllResourceEditor({
  resource,
  isFirst = false,
  isLast = false,
  lessonOptions = [],
  action,
  actionPending = false,
}: {
  resource?: Resource;
  isFirst?: boolean;
  isLast?: boolean;
  lessonOptions?: Array<{ id: string; trackId: string; trackTitle: string; title: string }>;
  /** Publicar, descartar, voltar, mover e arquivar: o estado fica na lista, que não recarrega. */
  action?: (form: FormData) => void;
  actionPending?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveSllResourceForm, initialState);
  const initial = {
    groupTitle: resource?.draft?.groupTitle ?? resource?.groupTitle ?? '',
    title: resource?.draft?.title ?? resource?.title ?? '',
    description: resource?.draft?.description ?? resource?.description ?? '',
    buttonLabel: resource?.draft?.buttonLabel ?? resource?.buttonLabel ?? '',
    destination: resource?.draft?.destination ?? resource?.destination ?? '',
  };
  const [preview, setPreview] = useState(initial);
  const [dirty, setDirty] = useState(false);
  // Cada resposta é um objeto novo: assim a segunda gravação seguida também limpa o aviso de
  // "alterações não salvas" (um efeito em `state.saved` não rodaria de novo).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.saved) setDirty(false);
  }
  const [lessonIds, setLessonIds] = useState(resource?.relatedLessonIds ?? []);
  const [lessonChoice, setLessonChoice] = useState('');
  const [trackChoice, setTrackChoice] = useState('');
  const trackOptions = Array.from(
    new Map(lessonOptions.map((item) => [item.trackId, item.trackTitle])).entries(),
  );
  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const values = new FormData(event.currentTarget);
    setPreview({
      groupTitle: String(values.get('groupTitle') ?? ''),
      title: String(values.get('title') ?? ''),
      description: String(values.get('description') ?? ''),
      buttonLabel: String(values.get('buttonLabel') ?? ''),
      destination: String(values.get('destination') ?? ''),
    });
    setDirty(true);
  }

  const editor = (
    <>
      <form
        noValidate
        action={formAction}
        className="flex flex-col gap-4"
        onChange={updatePreview}
        onInput={updatePreview}
      >
        {resource ? <input name="id" type="hidden" value={resource.id} /> : null}
        <FloatingLabelInput
          defaultValue={initial.groupTitle}
          id={`resource-group-title-${resource?.id ?? 'new'}`}
          label="Nome do grupo"
          maxLength={100}
          name="groupTitle"
          required
        />
        {resource ? <input name="groupKey" type="hidden" value={resource.groupKey} /> : null}
        <FloatingLabelInput
          defaultValue={initial.title}
          id={`resource-title-${resource?.id ?? 'new'}`}
          label="Nome do recurso"
          maxLength={160}
          name="title"
          required
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`resource-description-${resource?.id ?? 'new'}`}>Descrição</Label>
          <Textarea
            className="min-h-24"
            defaultValue={initial.description}
            id={`resource-description-${resource?.id ?? 'new'}`}
            maxLength={600}
            name="description"
            required
          />
        </div>
        <FloatingLabelInput
          defaultValue={initial.buttonLabel}
          id={`resource-button-${resource?.id ?? 'new'}`}
          label="Texto do botão (obrigatório se houver destino)"
          maxLength={80}
          name="buttonLabel"
        />
        <FloatingLabelInput
          defaultValue={initial.destination}
          id={`resource-destination-${resource?.id ?? 'new'}`}
          label="Destino (vazio = Em breve)"
          maxLength={500}
          name="destination"
        />
        <input name="position" type="hidden" value={resource?.position ?? 999} />
        {lessonIds.map((id) => (
          <input key={id} name="relatedLessonId" type="hidden" value={id} />
        ))}
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          <p className="text-body font-semibold text-foreground">Mostrar também em aulas</p>
          <p className="text-body text-muted-foreground">
            Opcional. Escolha as aulas que devem mostrar este recurso.
          </p>
          {lessonIds.length ? (
            <ul className="flex flex-col gap-2">
              {lessonIds.map((id) => (
                <li
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted px-3 text-body text-foreground"
                  key={id}
                >
                  <span className="min-w-0">
                    {lessonOptions.find((item) => item.id === id)?.trackTitle} ·{' '}
                    {lessonOptions.find((item) => item.id === id)?.title ?? 'Aula indisponível'}
                  </span>
                  <Button
                    aria-label={`Remover aula ${lessonOptions.find((item) => item.id === id)?.title ?? ''}`}
                    onClick={() => setLessonIds((current) => current.filter((item) => item !== id))}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <Label htmlFor={`resource-track-${resource?.id ?? 'new'}`}>Escolher curso</Label>
          <Select
            id={`resource-track-${resource?.id ?? 'new'}`}
            onChange={(event) => {
              setTrackChoice(event.currentTarget.value);
              setLessonChoice('');
            }}
            value={trackChoice}
          >
            <option value="">Selecione um curso</option>
            {trackOptions.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </Select>
          <Label htmlFor={`resource-lesson-${resource?.id ?? 'new'}`}>Escolher aula</Label>
          <Select
            disabled={!trackChoice}
            id={`resource-lesson-${resource?.id ?? 'new'}`}
            onChange={(event) => setLessonChoice(event.currentTarget.value)}
            value={lessonChoice}
          >
            <option value="">Selecione uma aula</option>
            {lessonOptions
              .filter((item) => item.trackId === trackChoice && !lessonIds.includes(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </Select>
          <Button
            disabled={!lessonChoice}
            onClick={() => {
              setLessonIds((current) => [...current, lessonChoice]);
              setLessonChoice('');
            }}
            type="button"
            variant="soft"
          >
            <Plus aria-hidden="true" />
            Adicionar aula
          </Button>
        </div>
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
          Salvar rascunho
        </Button>
      </form>
      {resource && action ? (
        // Um formulário só: cada botão manda a ação em `intent`, e a resposta aparece abaixo do
        // editor. Funciona também sem JavaScript.
        <form
          action={action}
          aria-busy={actionPending}
          className="flex flex-wrap gap-3 border-t border-border pt-4"
        >
          <input name="id" type="hidden" value={resource.id} />
          <Button
            className="!w-fit"
            disabled={resource.status === 'published' && !resource.draft}
            name="intent"
            type="submit"
            value="publish"
          >
            <Send aria-hidden="true" data-icon="inline-start" />
            Publicar para alunas
          </Button>
          {resource.draft ? (
            <Button className="!w-fit" name="intent" type="submit" value="discard" variant="soft">
              <FileX aria-hidden="true" data-icon="inline-start" />
              Descartar rascunho
            </Button>
          ) : null}
          {resource.hasHistory && !resource.draft ? (
            <Button className="!w-fit" name="intent" type="submit" value="restore" variant="soft">
              <History aria-hidden="true" data-icon="inline-start" />
              Voltar à versão anterior
            </Button>
          ) : null}
          <Button
            className="!w-fit"
            aria-label={`Mover para cima: ${resource.title}`}
            disabled={isFirst}
            name="intent"
            type="submit"
            value="up"
            variant="soft"
          >
            <ArrowUp aria-hidden="true" />
            Mover para cima
          </Button>
          <Button
            className="!w-fit"
            aria-label={`Mover para baixo: ${resource.title}`}
            disabled={isLast}
            name="intent"
            type="submit"
            value="down"
            variant="soft"
          >
            <ArrowDown aria-hidden="true" />
            Mover para baixo
          </Button>
          <Button className="!w-fit" name="intent" type="submit" value="archive" variant="soft">
            <Archive aria-hidden="true" data-icon="inline-start" />
            Arquivar recurso
          </Button>
        </form>
      ) : null}
    </>
  );
  return (
    <article className={`${panelCard} gap-5`}>
      <div>
        <h3 className="text-title font-semibold text-foreground">
          {resource ? `Editar ${resource.title}` : 'Novo recurso'}
        </h3>
        <p className="text-body text-muted-foreground">
          {resource?.status === 'published'
            ? 'As alunas continuam vendo a versão publicada até você publicar as mudanças.'
            : 'Salve e confira antes de publicar.'}
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-4">{editor}</div>
        <section
          aria-label="Prévia para alunas"
          className="rounded-2xl border border-border bg-background p-5"
        >
          <p className="text-body font-semibold text-foreground">
            Prévia para alunas{' '}
            {dirty ? '· alterações não salvas' : resource?.draft ? '· rascunho salvo' : ''}
          </p>
          <div className="mt-5 rounded-2xl bg-card p-5 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
            <p className="text-sm text-muted-foreground">{preview.groupTitle}</p>
            <h4 className="mt-2 text-title font-semibold text-foreground">
              {preview.title || 'Nome do recurso'}
            </h4>
            <p className="mt-2 text-body text-muted-foreground">
              {preview.description || 'A descrição aparece aqui.'}
            </p>
            <p className="mt-4 text-body font-semibold text-link">
              {preview.destination ? (
                <>
                  <ExternalLink aria-hidden="true" className="mr-2 inline size-5" />
                  {preview.buttonLabel || `Abrir ${preview.title || 'recurso'}`}
                </>
              ) : (
                'Em breve'
              )}
            </p>
          </div>
          {lessonIds.length ? (
            <div className="mt-5">
              <p className="text-body font-semibold text-foreground">Aparece também nestas aulas</p>
              <ul className="mt-2 list-inside list-disc text-body text-muted-foreground">
                {lessonIds.map((id) => (
                  <li key={id}>
                    {lessonOptions.find((item) => item.id === id)?.trackTitle} ·{' '}
                    {lessonOptions.find((item) => item.id === id)?.title ?? 'Aula indisponível'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}

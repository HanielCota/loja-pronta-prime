'use client';

import { useActionState, useState, type FormEvent } from 'react';
import { ChevronDown, FileX, History, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { panelCard } from '@/features/member/components/area-shell';
import { SLL_COPY, SLL_COPY_GROUPS, type SllCopy } from '@/features/sll/copy';
import { EditorActionMessage, useEditorActions } from './editor-actions';
import { runSllCopyActionForm, saveSllCopyForm } from '../server/actions';
import { Textarea } from '@/components/ui/textarea';

const initialState = { saved: false, message: '' };

function CopyGroup({
  index,
  copy,
  hasDraft,
  hasHistory,
}: {
  index: number;
  copy: SllCopy;
  hasDraft: boolean;
  hasHistory: boolean;
}) {
  const group = SLL_COPY_GROUPS[index]!;
  const [state, action, pending] = useActionState(saveSllCopyForm, initialState);
  const groupActions = useEditorActions(runSllCopyActionForm);
  const [preview, setPreview] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.fields.map(({ key }) => [key, copy[key]])),
  );
  const [dirty, setDirty] = useState(false);
  // Cada resposta é um objeto novo: assim a segunda gravação seguida também limpa o aviso de
  // "alterações não salvas" (um efeito em `state.saved` não rodaria de novo).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.saved) setDirty(false);
  }
  // Publicar, descartar ou voltar troca os textos salvos: o formulário (pela chave) e a prévia
  // recomeçam com eles.
  const [seenRevision, setSeenRevision] = useState(groupActions.revision);
  if (seenRevision !== groupActions.revision) {
    setSeenRevision(groupActions.revision);
    setPreview(Object.fromEntries(group.fields.map(({ key }) => [key, copy[key]])));
    setDirty(false);
  }
  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    setPreview(
      Object.fromEntries(group.fields.map(({ key }) => [key, String(data.get(key) ?? '')])),
    );
    setDirty(true);
  }
  return (
    <details className={`${panelCard} group`}>
      <summary
        className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-field text-title font-semibold text-foreground outline-none hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        id={`copy-group-${index}`}
      >
        {group.title}
        <ChevronDown
          aria-hidden="true"
          className="size-6 shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
        />
      </summary>
      <div className="mt-5 grid gap-6 border-t border-border pt-5 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <form
            noValidate
            action={action}
            className="flex flex-col gap-4"
            key={groupActions.revision}
            onChange={updatePreview}
            onInput={updatePreview}
          >
            <input name="groupIndex" type="hidden" value={index} />
            {/* Campo longo ou curto pelo texto original, não pelo salvo: assim o campo não troca
                de tipo (e não perde o foco) depois de salvar. */}
            {group.fields.map(({ key, label }) =>
              SLL_COPY[key].length > 110 ? (
                <div className="flex flex-col gap-2" key={key}>
                  <Label htmlFor={`copy-${key}`}>{label}</Label>
                  <Textarea
                    className="min-h-24"
                    defaultValue={copy[key]}
                    id={`copy-${key}`}
                    maxLength={600}
                    name={key}
                    required
                  />
                </div>
              ) : (
                <FloatingLabelInput
                  defaultValue={copy[key]}
                  id={`copy-${key}`}
                  key={key}
                  label={label}
                  maxLength={600}
                  name={key}
                  required
                />
              ),
            )}
            {state.message ? (
              <p
                className={state.saved ? 'text-body text-foreground' : 'text-body text-destructive'}
                role={state.saved ? undefined : 'alert'}
              >
                {state.message}
              </p>
            ) : null}
            {/* Sempre presente: regiões criadas junto com o texto costumam não ser anunciadas. */}
            <LiveRegion>{state.saved ? state.message : null}</LiveRegion>
            <Button className="sm:!w-fit" loading={pending} loadingText="Salvando…" type="submit">
              <Save aria-hidden="true" />
              Salvar rascunho
            </Button>
          </form>
          {hasDraft || hasHistory ? (
            // Um formulário só: cada botão manda a ação em `intent`, com a resposta logo abaixo.
            <form
              action={groupActions.run}
              aria-busy={groupActions.pending}
              className="flex flex-wrap gap-3"
            >
              <input name="groupIndex" type="hidden" value={index} />
              {hasDraft ? (
                <>
                  <Button className="sm:!w-fit" name="intent" type="submit" value="publish">
                    <Send aria-hidden="true" data-icon="inline-start" />
                    Publicar para alunas
                  </Button>
                  <Button
                    className="sm:!w-fit"
                    name="intent"
                    type="submit"
                    value="discard"
                    variant="soft"
                  >
                    <FileX aria-hidden="true" data-icon="inline-start" />
                    Descartar rascunho
                  </Button>
                </>
              ) : (
                <Button
                  className="sm:!w-fit"
                  name="intent"
                  type="submit"
                  value="restore"
                  variant="soft"
                >
                  <History aria-hidden="true" data-icon="inline-start" />
                  Voltar à versão anterior
                </Button>
              )}
            </form>
          ) : null}
          <EditorActionMessage
            message={groupActions.message}
            messageRef={groupActions.messageRef}
          />
        </div>
        <section
          aria-label={`Prévia de ${group.title}`}
          className="rounded-2xl border border-border bg-background p-5"
        >
          <h3 className="text-body font-semibold text-foreground">
            Prévia dos textos{' '}
            {dirty ? '· alterações não salvas' : hasDraft ? '· rascunho salvo' : ''}
          </h3>
          <dl className="mt-4 flex flex-col gap-4">
            {group.fields.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-body text-foreground">{preview[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </details>
  );
}

export function SllCopyEditor({
  copy,
  draftKeys,
  historyKeys,
}: {
  copy: SllCopy;
  draftKeys: string[];
  historyKeys: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {SLL_COPY_GROUPS.map((group, index) => (
        <CopyGroup
          copy={copy}
          hasDraft={group.fields.every(({ key }) => draftKeys.includes(key))}
          hasHistory={group.fields.every(({ key }) => historyKeys.includes(key))}
          index={index}
          key={group.title}
        />
      ))}
    </div>
  );
}

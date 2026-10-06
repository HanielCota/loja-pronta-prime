'use client';

import { useActionState, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { panelCard } from '@/features/member/components/area-shell';
import { SLL_COPY_GROUPS, type SllCopy } from '@/features/sll/copy';
import {
  discardSllCopyDraftForm,
  publishSllCopyForm,
  restoreSllCopyVersionForm,
  saveSllCopyForm,
} from '../server/actions';

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
  const router = useRouter();
  const [preview, setPreview] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.fields.map(({ key }) => [key, copy[key]])),
  );
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (state.saved) router.refresh();
  }, [router, state.saved]);
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
        className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-title font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            action={action}
            className="flex flex-col gap-4"
            onChange={updatePreview}
            onInput={updatePreview}
          >
            <input name="groupIndex" type="hidden" value={index} />
            {group.fields.map(({ key, label }) =>
              copy[key].length > 110 ? (
                <div className="flex flex-col gap-2" key={key}>
                  <Label htmlFor={`copy-${key}`}>{label}</Label>
                  <textarea
                    className="min-h-24 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                aria-live="polite"
                className={state.saved ? 'text-body text-foreground' : 'text-body text-destructive'}
                role={state.saved ? 'status' : 'alert'}
              >
                {state.message}
              </p>
            ) : null}
            <Button className="sm:!w-fit" loading={pending} loadingText="Salvando…" type="submit">
              <Save aria-hidden="true" />
              Salvar rascunho
            </Button>
          </form>
          {hasDraft ? (
            <div className="flex flex-wrap gap-3">
              <form action={publishSllCopyForm}>
                <input name="groupIndex" type="hidden" value={index} />
                <Button type="submit">Publicar para alunas</Button>
              </form>
              <form action={discardSllCopyDraftForm}>
                <input name="groupIndex" type="hidden" value={index} />
                <Button type="submit" variant="soft">
                  Descartar rascunho
                </Button>
              </form>
            </div>
          ) : null}
          {hasHistory && !hasDraft ? (
            <form action={restoreSllCopyVersionForm}>
              <input name="groupIndex" type="hidden" value={index} />
              <Button type="submit" variant="soft">
                Voltar à versão anterior
              </Button>
            </form>
          ) : null}
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

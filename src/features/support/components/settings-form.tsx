'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { SUPPORT_TOPICS, type SupportPhones } from '../contacts';
import { saveSupportContacts, type SupportSettingsResult } from '../server/actions';

export function SupportSettingsForm({ phones }: { phones: SupportPhones }) {
  const [state, action, pending] = useActionState<SupportSettingsResult, FormData>(
    saveSupportContacts,
    { saved: false, message: '' },
  );
  return (
    <form action={action} className="flex flex-col gap-6">
      <p id="support-phone-help" className="text-body text-muted-foreground">
        Informe o WhatsApp com DDD. Pode incluir +55. Deixe vazio para mostrar “Em breve” às alunas.
      </p>
      {SUPPORT_TOPICS.map((topic) => (
        <fieldset key={topic.id} className="flex min-w-0 flex-col gap-3">
          <legend className="mb-3 text-body font-semibold">
            {topic.title} · {topic.name}
          </legend>
          <FloatingLabelInput
            id={`support-${topic.id}`}
            name={topic.id}
            label={`WhatsApp de ${topic.name}`}
            type="tel"
            inputMode="tel"
            maxLength={40}
            defaultValue={phones[topic.id]}
            aria-invalid={state.field === topic.id || undefined}
            aria-describedby={`support-phone-help${state.field === topic.id ? ' support-error' : ''}`}
          />
        </fieldset>
      ))}
      <Button type="submit" loading={pending} disabled={pending}>
        Salvar contatos
      </Button>
      {state.message ? (
        <p
          id="support-error"
          role={state.saved ? undefined : 'alert'}
          className={state.saved ? 'text-body text-progress-text' : 'text-body text-destructive'}
        >
          {state.message}
        </p>
      ) : null}
      <LiveRegion>{state.saved ? state.message : null}</LiveRegion>
    </form>
  );
}

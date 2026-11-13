'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { saveHotmartSettings } from '../server/actions';

export function HotmartSettingsForm({
  sll,
  store,
  configured,
  secondaryConfigured,
}: {
  sll: string;
  store: string;
  configured: boolean;
  secondaryConfigured: boolean;
}) {
  const [state, action, pending] = useActionState(saveHotmartSettings, {
    message: '',
    saved: false,
  });
  return (
    <form action={action} aria-labelledby="hotmart-config" className="flex flex-col gap-4">
      <p id="hotmart-token-help" className="text-body text-muted-foreground">
        Use um token por conta da Hotmart. Deixe os campos de token vazios para manter os tokens
        salvos.
      </p>
      <FloatingLabelInput
        id="hotmart-token"
        label={configured ? 'Token principal (salvo)' : 'Token principal da Hotmart'}
        name="token"
        type="password"
        autoComplete="section-hotmart-primary new-password"
        aria-describedby="hotmart-token-help"
        maxLength={500}
        required={!configured}
      />
      <FloatingLabelInput
        id="hotmart-secondary-token"
        label={
          secondaryConfigured || state.secondaryConfigured
            ? 'Segundo token (salvo)'
            : 'Segundo token (opcional)'
        }
        name="secondaryToken"
        type="password"
        autoComplete="section-hotmart-secondary new-password"
        aria-describedby="hotmart-token-help"
        maxLength={500}
      />
      <FloatingLabelInput
        id="hotmart-sll"
        label="Código do produto SLL"
        name="sllCode"
        defaultValue={sll}
        required
        maxLength={150}
      />
      <FloatingLabelInput
        id="hotmart-store"
        label="Código do produto Loja Pronta"
        name="storeCode"
        defaultValue={store}
        required
        maxLength={150}
      />
      <Button type="submit" loading={pending} disabled={pending}>
        Salvar integração
      </Button>
      {state.message ? (
        <p
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

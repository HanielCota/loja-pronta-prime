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
}: {
  sll: string;
  store: string;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(saveHotmartSettings, {
    message: '',
    saved: false,
  });
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-body text-muted-foreground">
        Copie o token de verificação e o código único de cada produto na Hotmart. O token já salvo
        nunca aparece aqui.
      </p>
      <FloatingLabelInput
        id="hotmart-token"
        label={
          configured
            ? 'Novo token de verificação (deixe vazio para manter)'
            : 'Token de verificação da Hotmart'
        }
        name="token"
        type="password"
        autoComplete="off"
        required={!configured}
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

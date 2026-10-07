'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import { calculatePrice, calculateDiscount, calculateAds } from '../server/actions';
import { EMPTY_CALCULATOR } from '../state';
import type { CalculatorKind } from '../form-input';
import { CalculatorFields } from './calculator-fields';
import { CalculatorResult } from './calculator-result';

const ACTIONS = { price: calculatePrice, discount: calculateDiscount, ads: calculateAds };

export function CalculatorForm({ kind, permalink }: { kind: CalculatorKind; permalink: string }) {
  const [state, action, pending] = useActionState(ACTIONS[kind], EMPTY_CALCULATOR, permalink);
  const [dirty, setDirty] = useState(false);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setDirty(false);
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <form
        action={action}
        onChange={() => setDirty(true)}
        className={cn(panelCard, 'gap-6 p-5 sm:p-6')}
      >
        <fieldset disabled={pending} className="contents">
          <CalculatorFields kind={kind} state={state} />
        </fieldset>
        {state.message ? (
          <p role="alert" className="text-body text-destructive">
            {state.message}
          </p>
        ) : null}
        <Button type="submit" loading={pending} loadingText="Calculando…">
          {kind === 'price'
            ? 'Calcular meu preço'
            : kind === 'discount'
              ? 'Simular promoção'
              : 'Calcular limite de anúncios'}
        </Button>
      </form>
      <div className="flex min-w-0 flex-col gap-4" aria-live="polite" aria-atomic="true">
        {dirty && state.result ? (
          <p className="rounded-2xl bg-primary-soft p-4 text-body text-foreground">
            Você mudou os valores. Calcule novamente para atualizar o resultado.
          </p>
        ) : null}
        {state.result ? (
          <CalculatorResult result={state.result} />
        ) : (
          <section className={cn(panelCard, 'gap-3 p-5 sm:p-6')}>
            <h2 className="text-xl font-semibold text-foreground">Faça sua simulação</h2>
            <p className="text-body text-muted-foreground">
              Preencha os custos de uma unidade. O resultado mostra quanto sobra e como cada custo
              entra na conta.
            </p>
          </section>
        )}
      </div>
      <LiveRegion>
        {state.result ? 'Cálculo concluído. Seu resultado está disponível.' : ''}
      </LiveRegion>
    </div>
  );
}

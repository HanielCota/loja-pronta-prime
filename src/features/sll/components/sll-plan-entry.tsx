'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';
import { saveSllPlanIntake, type SllPlanIntakeActionResult } from '../server/actions';

const INITIAL_STATE: SllPlanIntakeActionResult = { saved: false, message: '' };

/** Primeira entrada do plano; o formulário continua funcionando com JavaScript desligado. */
export function SllPlanEntry() {
  const [state, action, isPending] = useActionState(saveSllPlanIntake, INITIAL_STATE);
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!state.saved || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [router, state.saved]);

  return (
    <section className={panelCard} aria-labelledby="plan-entry-title">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-link">Antes de começar</p>
        <h2 id="plan-entry-title" className="text-title font-semibold text-balance text-foreground">
          Há quanto tempo sua loja está aberta?
        </h2>
        <p className="text-body text-pretty text-muted-foreground">
          Essa resposta organiza o contexto do plano. Você poderá seguir no seu ritmo.
        </p>
      </div>

      <form action={action} className="mt-5 flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Escolha há quanto tempo sua loja está aberta</legend>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 text-body text-foreground outline-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring has-[:checked]:border-primary has-[:checked]:bg-primary-soft forced-colors:has-[:checked]:border-[Highlight]">
            <input
              className="size-5 accent-primary"
              name="storeAge"
              type="radio"
              value="under_7_days"
            />
            <span>Minha loja tem menos de 7 dias</span>
          </label>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 text-body text-foreground outline-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring has-[:checked]:border-primary has-[:checked]:bg-primary-soft forced-colors:has-[:checked]:border-[Highlight]">
            <input
              className="size-5 accent-primary"
              name="storeAge"
              type="radio"
              value="exactly_7_days"
            />
            <span>Minha loja tem exatamente 7 dias</span>
          </label>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 text-body text-foreground outline-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring has-[:checked]:border-primary has-[:checked]:bg-primary-soft forced-colors:has-[:checked]:border-[Highlight]">
            <input
              className="size-5 accent-primary"
              name="storeAge"
              type="radio"
              value="over_7_days"
            />
            <span>Minha loja tem mais de 7 dias</span>
          </label>
        </fieldset>
        <Button loading={isPending} loadingText="Salvando…">
          Continuar para o plano
        </Button>
        {state.message ? (
          <p
            className={state.saved ? 'text-body text-progress-text' : 'text-body text-destructive'}
          >
            {state.message}
          </p>
        ) : null}
        <LiveRegion>{state.message}</LiveRegion>
      </form>
    </section>
  );
}

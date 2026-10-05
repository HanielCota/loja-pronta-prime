'use client';

import { SparklesIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { LogoPicks } from '../model';
import { missingStudioSteps, pickLabel, STUDIO_STEPS, type StudioStep } from '../picks';

/**
 * Tudo escolhido: o resumo (cada escolha com "Mudar") e "Criar meu logo".
 */
export function StudioReview({
  steps,
  picks,
  titleId,
  generationsLeft,
  hasLogos,
  error,
  errorId,
  busy,
  onChange,
  onBack,
  onCreate,
  onShowLogos,
  rail,
}: {
  steps: StudioStep[];
  picks: LogoPicks;
  titleId: string;
  generationsLeft: number;
  hasLogos: boolean;
  error: string | undefined;
  errorId: string;
  busy: boolean;
  onChange: (step: StudioStep) => void;
  onBack: () => void;
  onCreate: () => void;
  onShowLogos: () => void;
  rail: ReactNode;
}) {
  const missing = missingStudioSteps(picks);
  const missingMessage = missing.length
    ? `Falta escolher: ${missing.map((step) => STUDIO_STEPS[step].label).join(', ')}. Complete essas etapas antes de criar o logo.`
    : undefined;
  const labelForStep = (step: StudioStep) =>
    missing.includes(step) ? null : pickLabel(step, picks);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {rail}
      <div className="flex flex-col gap-1.5">
        <p className="text-body font-semibold text-link">
          {missing.length ? 'Falta completar' : 'Tudo escolhido'}
        </p>
        <h1
          id={titleId}
          tabIndex={-1}
          className="text-title font-bold text-balance outline-none sm:text-title-lg"
        >
          Confira e crie o seu logo
        </h1>
        <p className="text-body text-pretty text-muted-foreground">
          O rascunho é só pra você imaginar. A IA desenha a versão final, caprichada, com essas
          escolhas.
        </p>
      </div>

      <dl className="flex flex-col rounded-3xl bg-card px-5 py-1 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
        {steps.map((step) => (
          <div
            key={step}
            className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
          >
            <dt className="w-24 shrink-0 text-body text-muted-foreground">
              {STUDIO_STEPS[step].label}
            </dt>
            <dd className="min-w-0 flex-1 text-body font-semibold break-words">
              {labelForStep(step) ?? 'Ainda não escolhido'}
            </dd>
            <dd>
              <Button
                type="button"
                variant="link"
                size="inline"
                className="px-2 font-semibold"
                disabled={busy}
                onClick={() => onChange(step)}
              >
                {labelForStep(step) ? 'Mudar' : 'Escolher'}
                <span className="sr-only"> {STUDIO_STEPS[step].label.toLowerCase()}</span>
              </Button>
            </dd>
          </div>
        ))}
      </dl>

      <p
        id={errorId}
        role={missingMessage || error ? 'alert' : undefined}
        className="rounded-2xl bg-destructive-soft px-4 py-3 text-body text-pretty text-destructive empty:hidden forced-colors:border forced-colors:border-[CanvasText]"
      >
        {[missingMessage, error].filter(Boolean).join(' ')}
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="w-auto border border-border px-5 text-link"
            disabled={busy}
            onClick={onBack}
          >
            Voltar
          </Button>
          {generationsLeft ? (
            <Button
              type="button"
              className="w-auto flex-1"
              disabled={busy || missing.length > 0}
              aria-describedby={missingMessage || error ? errorId : undefined}
              onClick={onCreate}
            >
              {hasLogos ? 'Criar outro logo' : 'Criar meu logo'}
              <SparklesIcon aria-hidden="true" />
            </Button>
          ) : (
            <p className="min-w-0 flex-1 text-body text-pretty text-muted-foreground">
              Você já criou todos os logos que dava. Escolha um deles pra seguir.
            </p>
          )}
        </div>
        {generationsLeft ? (
          <p className="text-center text-body text-pretty text-muted-foreground">
            Você ainda pode criar {generationsLeft} {generationsLeft === 1 ? 'logo' : 'logos'}.
            Leva uns 15 segundos.
          </p>
        ) : null}
        {hasLogos ? (
          <Button type="button" variant="soft" disabled={busy} onClick={onShowLogos}>
            Ver os meus logos
          </Button>
        ) : null}
      </div>
    </div>
  );
}

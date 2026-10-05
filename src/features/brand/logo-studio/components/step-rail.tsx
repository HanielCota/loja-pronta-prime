import { cn } from '@/lib/utils';
import type { LogoPicks } from '../model';
import { pickLabel, STUDIO_STEPS, type StudioStep } from '../picks';

/**
 * As telas do estúdio numa barra (um tracinho por escolha, com o nome embaixo): as já escolhidas
 * ficam azuis e, tocando, ela volta direto nelas. No celular, só o nome da tela da vez aparece.
 */
export function StepRail({
  steps,
  current,
  picks,
  disabled,
  onJump,
}: {
  steps: StudioStep[];
  /** A tela da vez (no resumo, nenhuma). */
  current: StudioStep | null;
  picks: LogoPicks;
  disabled: boolean;
  onJump: (step: StudioStep) => void;
}) {
  return (
    <nav aria-label="Escolhas do logo">
      <ol className="flex gap-1.5">
        {steps.map((step) => {
          const label = STUDIO_STEPS[step].label;
          const value = pickLabel(step, picks);
          const active = step === current;
          const bar = cn(
            'h-1.5 w-full rounded-full',
            active || value ? 'bg-primary' : 'bg-progress-track',
          );
          const name = cn(
            'truncate text-left text-sm',
            active ? 'font-bold text-foreground' : 'max-sm:sr-only',
          );
          return (
            <li key={step} className="flex min-w-0 flex-1">
              {value && !active ? (
                <button
                  type="button"
                  disabled={disabled}
                  // O nome inteiro de uma vez (pedaços escondidos ganhariam espaços no meio).
                  aria-label={`${label}: ${value}. Mudar`}
                  onClick={() => onJump(step)}
                  className="group flex min-h-11 w-full min-w-0 flex-col gap-1.5 rounded-md pt-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                  <span aria-hidden="true" className={bar} />
                  <span className={cn(name, 'text-link group-hover:underline')}>{label}</span>
                </button>
              ) : (
                <span
                  aria-current={active ? 'step' : undefined}
                  className="flex min-h-11 w-full min-w-0 flex-col gap-1.5 pt-2"
                >
                  <span aria-hidden="true" className={bar} />
                  <span className={cn(name, !active && 'text-muted-foreground')}>{label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { CheckIcon } from 'lucide-react';
import { STORE_PHASES } from '@/config/store-phases';
import { cn } from '@/lib/utils';

/**
 * Jornada da Loja Pronta: as 7 fases, com as concluídas marcadas e a atual em destaque (só ela
 * mostra o que acontece agora). A aluna sempre sabe em que fase está (docs/PRODUTO.md).
 */
export function StoreJourney({ phase }: { phase: number }) {
  const current = STORE_PHASES[phase - 1];
  return (
    <section aria-labelledby="fase-atual" className="flex flex-col gap-4">
      <div className="rounded-2xl bg-primary-soft px-5 py-4">
        <h2 id="fase-atual" className="text-sm font-semibold text-link">
          Fase {phase} de {STORE_PHASES.length}
        </h2>
        <p className="mt-1 text-body font-semibold text-foreground">{current?.title}</p>
        <p className="mt-1 text-sm text-pretty text-foreground/80">{current?.detail}</p>
      </div>

      <ol aria-label="Todas as fases da sua loja" className="flex flex-col">
        {STORE_PHASES.map((step, index) => {
          const number = index + 1;
          const done = number < phase;
          const isCurrent = number === phase;
          return (
            <li
              key={step.title}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative flex items-center gap-3 py-2 pl-1"
            >
              {/* Linha que liga as fases (decorativa). */}
              {number < STORE_PHASES.length ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-1/2 left-4 h-full w-px translate-y-3',
                    done ? 'bg-primary' : 'bg-border',
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  'relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-card text-primary ring-2 ring-primary',
                  !done && !isCurrent && 'bg-muted text-muted-foreground ring-1 ring-border',
                )}
              >
                {done ? <CheckIcon className="size-4" /> : number}
              </span>
              <span
                className={cn(
                  'text-sm',
                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.title}
                <span className="sr-only">
                  {done ? ' (concluída)' : isCurrent ? ' (fase atual)' : ' (a seguir)'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

import { CheckIcon } from 'lucide-react';
import { STORE_PHASES } from '@/config/store-phases';
import { cn } from '@/lib/utils';

/**
 * Jornada da Loja Pronta: as 7 fases, com as concluídas marcadas e a atual aberta em destaque
 * (só ela mostra o que acontece agora). A aluna sempre sabe em que fase está (docs/PRODUTO.md).
 */
export function StoreJourney({ phase }: { phase: number }) {
  return (
    <section aria-labelledby="fase-atual" className="flex flex-col gap-4">
      <h2 id="fase-atual" className="text-lg font-semibold text-foreground">
        Fase {phase} de {STORE_PHASES.length}
      </h2>

      <ol aria-label="Todas as fases da sua loja" className="flex flex-col">
        {STORE_PHASES.map((step, index) => {
          const number = index + 1;
          const done = number < phase;
          const isCurrent = number === phase;
          return (
            <li
              key={step.title}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex gap-3 px-3 py-2.5',
                isCurrent && 'my-1 rounded-2xl bg-primary-soft py-3.5',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground',
                  !done && !isCurrent && 'bg-muted text-muted-foreground ring-1 ring-border',
                )}
              >
                {done ? <CheckIcon className="size-4" /> : number}
              </span>
              <span className="flex min-w-0 flex-col gap-1 pt-0.5">
                <span
                  className={cn(
                    'text-body',
                    isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    done && 'text-foreground',
                  )}
                >
                  {step.title}
                  <span className="sr-only">
                    {done ? ' (concluída)' : isCurrent ? ' (fase atual)' : ' (a seguir)'}
                  </span>
                </span>
                {isCurrent ? (
                  <span className="text-body text-pretty text-foreground/80">{step.detail}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

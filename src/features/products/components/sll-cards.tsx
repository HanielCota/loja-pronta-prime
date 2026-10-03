import { CalculatorIcon, LockIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const PATH = [
  {
    title: 'Trilha de boas-vindas',
    detail: 'Como o curso funciona e o que você vai conquistar.',
    locked: false,
  },
  {
    title: 'Método em 3 Etapas',
    detail: 'Cada etapa abre quando você conclui a anterior.',
    locked: true,
  },
  { title: 'Minicursos', detail: 'Temas extras pra ir além do método.', locked: true },
] as const;

const TOOLS = [
  { title: 'Calculadora de preço da Shopee', icon: CalculatorIcon },
  { title: 'Assistentes de IA', icon: SparklesIcon },
] as const;

/** Selo pequeno ("Abre primeiro", "Em breve"): informa, não é botão. */
function Badge({ children, tone }: { children: string; tone: 'primary' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-sm font-semibold',
        tone === 'primary' ? 'bg-primary-soft text-link' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}

/**
 * Caminho do SLL: a ordem em que o curso abre (trilha, método, minicursos) e as ferramentas.
 * As aulas ainda não estão no ar; a tela já mostra por onde ela vai começar. Nada aqui é
 * clicável ainda, então nada tem cara de botão (sem fundo cheio, sem borda, sem ícone de play):
 * o que está por vir aparece em selos.
 */
export function SllPath() {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="seu-caminho" className="flex flex-col gap-3">
        <h2 id="seu-caminho" className="text-lg font-semibold text-foreground">
          Seu caminho no curso
        </h2>
        <ol className="flex flex-col divide-y divide-border">
          {PATH.map((step, index) => (
            <li key={step.title} className="flex gap-3 py-3.5">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
                  step.locked ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-link',
                )}
              >
                {step.locked ? <LockIcon className="size-4" /> : index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-1 pt-0.5">
                <span className="text-body font-semibold text-foreground">
                  {step.title}
                  {step.locked ? <span className="sr-only"> (bloqueado por enquanto)</span> : null}
                </span>
                <span className="text-body text-pretty text-muted-foreground">{step.detail}</span>
                {step.locked ? null : <Badge tone="primary">Abre primeiro</Badge>}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-body text-pretty text-muted-foreground">
          As aulas estão chegando. A trilha de boas-vindas é a primeira a abrir.
        </p>
      </section>

      <section aria-labelledby="ferramentas" className="flex flex-col gap-3">
        <h2 id="ferramentas" className="text-lg font-semibold text-foreground">
          Ferramentas
        </h2>
        <ul className="flex flex-col divide-y divide-border">
          {TOOLS.map(({ title, icon: Icon }) => (
            <li key={title} className="flex items-center gap-3 py-3.5">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-body text-foreground">{title}</span>
              <Badge tone="muted">Em breve</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

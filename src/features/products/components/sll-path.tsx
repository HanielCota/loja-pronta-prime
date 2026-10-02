import { CalculatorIcon, LockIcon, PlayIcon, SparklesIcon } from 'lucide-react';

const PATH = [
  {
    title: 'Trilha de boas-vindas',
    detail: 'Comece por aqui: como o curso funciona e o que você vai conquistar.',
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

/**
 * Caminho do SLL: a ordem em que o curso abre (trilha, método, minicursos) e as ferramentas.
 * As aulas ainda não estão no ar; a tela já mostra por onde ela vai começar.
 */
export function SllPath() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="seu-caminho" className="flex flex-col gap-3">
        <h2 id="seu-caminho" className="text-sm font-semibold text-foreground">
          Seu caminho no curso
        </h2>
        <ol className="flex flex-col gap-2">
          {PATH.map((step, index) => (
            <li
              key={step.title}
              className={
                step.locked
                  ? 'flex items-center gap-3 rounded-2xl border border-border px-4 py-3'
                  : 'flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3'
              }
            >
              <span
                aria-hidden="true"
                className={
                  step.locked
                    ? 'grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground'
                    : 'grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'
                }
              >
                {step.locked ? <LockIcon className="size-4" /> : <PlayIcon className="size-4" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {index + 1}. {step.title}
                  {step.locked ? <span className="sr-only"> (bloqueado por enquanto)</span> : null}
                </span>
                <span
                  className={
                    step.locked
                      ? 'text-sm text-pretty text-muted-foreground'
                      : 'text-sm text-pretty text-foreground/80'
                  }
                >
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-pretty text-muted-foreground">
          As aulas estão chegando. A trilha de boas-vindas é a primeira a abrir.
        </p>
      </section>

      <section aria-labelledby="ferramentas" className="flex flex-col gap-3">
        <h2 id="ferramentas" className="text-sm font-semibold text-foreground">
          Ferramentas
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TOOLS.map(({ title, icon: Icon }) => (
            <li
              key={title}
              className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-foreground"
            >
              <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <span className="flex flex-col">
                {title}
                <span className="text-muted-foreground">Em breve</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

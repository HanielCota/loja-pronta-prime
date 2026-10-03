import { CalculatorIcon, LockIcon, MessagesSquareIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { panelCard, sectionTitleClass } from './area-shell';

const PATH = [
  { title: 'Trilha de boas-vindas', detail: 'Como o curso funciona.', locked: false },
  {
    title: 'Método em 3 Etapas',
    detail: 'Cada etapa abre quando você conclui a anterior.',
    locked: true,
  },
  { title: 'Minicursos', detail: 'Temas extras depois do método.', locked: true },
] as const;

const TOOLS = [
  { title: 'Calculadora de preço da Shopee', icon: CalculatorIcon },
  { title: 'Assistentes de IA', icon: MessagesSquareIcon },
] as const;

/**
 * Caminho do SLL, na ordem em que o curso abre. As aulas ainda não estão no ar, então nada aqui é
 * clicável nem tem cara de botão.
 */
export function SllCourseCard() {
  return (
    <section aria-labelledby="seu-caminho" className={cn(panelCard, 'gap-3')}>
      <h2 id="seu-caminho" className={sectionTitleClass}>
        Seu caminho no curso
      </h2>
      <ol className="flex flex-col divide-y divide-border">
        {PATH.map((step, index) => (
          <li key={step.title} className="flex gap-3 py-3.5">
            <span
              aria-hidden="true"
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
                step.locked
                  ? 'bg-muted text-muted-foreground ring-1 ring-border'
                  : 'bg-primary-soft text-link',
              )}
            >
              {step.locked ? <LockIcon className="size-4" /> : index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <span className="text-body font-semibold text-foreground">
                {step.title}
                {step.locked ? <span className="sr-only"> (bloqueado por enquanto)</span> : null}
              </span>
              <span className="text-body text-pretty text-muted-foreground">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Ferramentas do curso, ainda por vir. */
export function SllToolsCard() {
  return (
    <section aria-labelledby="ferramentas" className={cn(panelCard, 'gap-3')}>
      <h2 id="ferramentas" className={sectionTitleClass}>
        Ferramentas
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {TOOLS.map(({ title, icon: Icon }) => (
          <li key={title} className="flex items-center gap-3 py-3.5">
            <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 text-body text-foreground">{title}</span>
            <span className="text-sm text-muted-foreground">Em breve</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

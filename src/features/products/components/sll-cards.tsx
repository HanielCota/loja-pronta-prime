import type { ReactNode } from 'react';
import { ArrowRight, Check, ChevronRight, CirclePlay, GraduationCap, LockIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { panelCard } from '@/features/member/components/area-shell';
import type { SllCopy } from '@/features/sll/copy';
import {
  chooseSllNextStep,
  type SllNextStep,
  type SllPathStepId,
  type SllWelcomeProgress,
} from '@/features/sll/dashboard-next-step';

type PathStep = {
  id: SllPathStepId;
  href: string | null;
  title: string;
  detail: string;
};

const NEXT_STEP_LABEL: Record<SllNextStep['mode'], string> = {
  start: 'Começar',
  continue: 'Continuar',
  review: 'Rever as aulas',
  open: 'Abrir',
};

const OPEN_LABEL: Record<SllPathStepId, string> = {
  welcome: 'Abrir',
  method: 'Ver o método',
  courses: 'Ver os cursos',
};

function nextStepLabel(step: SllNextStep): string {
  if (step.mode === 'open') return OPEN_LABEL[step.id];
  return NEXT_STEP_LABEL[step.mode];
}

const rowLinkClass =
  'group flex min-h-16 items-center gap-4 rounded-2xl px-4 py-3 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150';

// Separador com recuo, como nas listas de ajustes: começa no texto, não embaixo do ícone.
const insetSeparatorClass =
  'relative not-first:before:absolute not-first:before:top-0 not-first:before:right-4 not-first:before:left-18 not-first:before:h-px not-first:before:bg-border';

function RowIcon({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5',
        muted ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-link',
      )}
    >
      {children}
    </span>
  );
}

function RowText({ title, detail }: { title: ReactNode; detail: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-body font-semibold text-foreground">{title}</span>
      <span className="text-body text-pretty text-muted-foreground">{detail}</span>
    </span>
  );
}

const rowChevron = (
  <ChevronRight
    aria-hidden="true"
    className="size-5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150 group-hover:motion-safe:translate-x-0.5"
  />
);

/** Barra de progresso real das boas-vindas; o texto ao lado diz o mesmo pra quem não vê a barra. */
function WelcomeProgress({ progress }: { progress: SllWelcomeProgress }) {
  const percent = Math.round((progress.completed / progress.total) * 100);
  return (
    <div className="flex max-w-md flex-col gap-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        {progress.completed} de {progress.total} aulas assistidas
      </p>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out forced-colors:bg-[Highlight]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function stepIcon(step: PathStep, welcomeDone: boolean) {
  if (!step.href) return <LockIcon />;
  if (step.id === 'welcome' && welcomeDone) return <Check />;
  if (step.id === 'courses') return <GraduationCap />;
  return <CirclePlay />;
}

/** Os outros passos do caminho, em lista calma ao lado do destaque. */
function OtherSteps({ steps, welcomeDone }: { steps: PathStep[]; welcomeDone: boolean }) {
  if (!steps.length) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-6 lg:w-80 lg:shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
      <h3 className="text-sm font-semibold text-muted-foreground">Também no seu caminho</h3>
      <ol className="-mx-4 flex flex-col">
        {steps.map((step) => {
          const detail = step.id === 'welcome' && welcomeDone ? 'Concluída' : step.detail;
          return (
            <li key={step.id} className={insetSeparatorClass}>
              {step.href ? (
                <Link className={rowLinkClass} href={step.href}>
                  <RowIcon>{stepIcon(step, welcomeDone)}</RowIcon>
                  <RowText title={step.title} detail={detail} />
                  {rowChevron}
                </Link>
              ) : (
                <div className="flex min-h-16 items-center gap-4 px-4 py-3">
                  <RowIcon muted>{stepIcon(step, welcomeDone)}</RowIcon>
                  <RowText
                    title={
                      <>
                        {step.title}
                        <span className="sr-only"> (em breve)</span>
                      </>
                    }
                    detail="Em breve"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Destaque do painel: o próximo passo, grande, com um único botão. O resto do caminho fica ao
 * lado, em lista, pra ela saber o que vem depois sem ter que escolher agora.
 */
export function SllNextStepCard({
  welcomeHref,
  methodHref,
  coursesHref,
  welcomeProgress,
  copy,
}: {
  welcomeHref: string | null;
  methodHref: string | null;
  coursesHref: string | null;
  welcomeProgress: SllWelcomeProgress | null;
  copy: SllCopy;
}) {
  const steps: PathStep[] = [
    {
      id: 'welcome',
      href: welcomeHref,
      title: copy.dashboardWelcomeTitle,
      detail: copy.dashboardWelcomeDetail,
    },
    {
      id: 'method',
      href: methodHref,
      title: copy.dashboardMethodTitle,
      detail: copy.dashboardMethodDetail,
    },
    {
      id: 'courses',
      href: coursesHref,
      title: copy.dashboardCoursesTitle,
      detail: copy.dashboardCoursesDetail,
    },
  ];
  const next = chooseSllNextStep(steps, welcomeProgress);
  const current = steps.find((step) => step.id === next?.id) ?? null;
  const others = steps.filter((step) => step.id !== current?.id);
  const welcomeDone = Boolean(
    welcomeProgress &&
    welcomeProgress.total > 0 &&
    welcomeProgress.completed >= welcomeProgress.total,
  );
  const showProgress =
    next?.id === 'welcome' && next.mode !== 'review' && welcomeProgress && welcomeProgress.total;

  return (
    <section
      aria-labelledby="seu-caminho"
      className={cn(panelCard, 'gap-8 lg:flex-row lg:items-start lg:gap-8')}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 id="seu-caminho" className="text-body font-semibold text-link">
            {copy.dashboardPathTitle}
          </h2>
          <p className="text-title font-semibold text-balance text-foreground sm:text-title-lg">
            {current ? current.title : 'As aulas abrem em breve'}
          </p>
          <p className="max-w-[48ch] text-body text-pretty text-muted-foreground">
            {current ? current.detail : 'Quando a primeira aula sair, ela aparece aqui.'}
          </p>
        </div>
        {showProgress ? <WelcomeProgress progress={welcomeProgress} /> : null}
        {next && current ? (
          <Button asChild className="sm:w-fit sm:min-w-52">
            <Link href={next.href}>
              {nextStepLabel(next)}
              <span className="sr-only">: {current.title}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
      <OtherSteps steps={others} welcomeDone={welcomeDone} />
    </section>
  );
}

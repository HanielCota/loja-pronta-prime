import { ArrowRight, BookOpen, CirclePlay, LockIcon, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { panelCard, sectionTitleClass } from '@/features/member/components/area-shell';
import type { SllCopy } from '@/features/sll/copy';

/**
 * Caminho do SLL, na ordem em que o curso abre. Só vira link o que já tem aula publicada; o
 * resto aparece com cadeado, sem cara de botão.
 */
export function SllCourseCard({
  welcomeHref,
  methodHref,
  coursesHref,
  copy,
}: {
  welcomeHref: string | null;
  methodHref: string | null;
  coursesHref: string | null;
  copy: SllCopy;
}) {
  const steps = [
    { title: copy.dashboardWelcomeTitle, detail: copy.dashboardWelcomeDetail },
    { title: copy.dashboardMethodTitle, detail: copy.dashboardMethodDetail },
    { title: copy.dashboardCoursesTitle, detail: copy.dashboardCoursesDetail },
  ];
  return (
    <section aria-labelledby="seu-caminho" className={cn(panelCard, 'gap-3')}>
      <h2 id="seu-caminho" className={sectionTitleClass}>
        {copy.dashboardPathTitle}
      </h2>
      <ol className="flex flex-col divide-y divide-border">
        {steps.map((step, index) => {
          const href = index === 0 ? welcomeHref : index === 1 ? methodHref : coursesHref;
          return (
            <li key={step.title} className="py-3.5">
              {href ? (
                <Link
                  className="flex min-h-14 items-center gap-3 rounded-2xl outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                  href={href}
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-link"
                  >
                    <CirclePlay className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body font-semibold text-foreground">{step.title}</span>
                    <span className="text-body text-pretty text-muted-foreground">
                      {step.detail}
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-border"
                  >
                    <LockIcon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                    <span className="text-body font-semibold text-foreground">
                      {step.title}
                      <span className="sr-only"> (bloqueado por enquanto)</span>
                    </span>
                    <span className="text-body text-pretty text-muted-foreground">
                      {step.detail}
                    </span>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Leva às ferramentas conferidas do curso. */
export function SllToolsCard({ copy }: { copy: SllCopy }) {
  return (
    <section aria-labelledby="ferramentas" className={cn(panelCard, 'gap-3')}>
      <h2 id="ferramentas" className={sectionTitleClass}>
        {copy.dashboardToolsTitle}
      </h2>
      <div className="flex items-center gap-3">
        <BookOpen aria-hidden="true" className="size-5 shrink-0 text-link" />
        <p className="flex-1 text-body text-muted-foreground">{copy.dashboardToolsDetail}</p>
      </div>
      <Button asChild className="mt-2" variant="soft">
        <Link href="/sll/recursos">
          {copy.dashboardToolsButton} <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

/** Reserva o lugar dos avisos individuais enquanto a Shopee ainda não envia status reais. */
export function SllStoresCard({ copy }: { copy: SllCopy }) {
  return (
    <section aria-labelledby="avisos-da-conta" className={cn(panelCard, 'gap-3')}>
      <h2 id="avisos-da-conta" className={sectionTitleClass}>
        {copy.dashboardStoresTitle}
      </h2>
      <div className="flex items-center gap-3">
        <Store aria-hidden="true" className="size-5 shrink-0 text-link" />
        <p className="flex-1 text-body text-muted-foreground">{copy.dashboardStoresDetail}</p>
      </div>
      <Button asChild className="mt-2" variant="soft">
        <Link href="/sll/minhas-lojas">
          {copy.dashboardStoresButton} <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

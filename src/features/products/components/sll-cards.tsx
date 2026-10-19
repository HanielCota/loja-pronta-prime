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
                  className="group flex min-h-14 items-center gap-3 rounded-2xl px-2 py-2 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors"
                  href={href}
                >
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-link"
                  >
                    <CirclePlay className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-body font-semibold text-foreground">{step.title}</span>
                    <span className="text-body text-pretty text-muted-foreground">
                      {step.detail}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-link motion-safe:transition-transform group-hover:motion-safe:translate-x-1"
                  />
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
      <Button asChild className="mt-2" variant="default">
        <Link href="/sll/recursos">
          {copy.dashboardToolsButton} <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

/** Direct students to their actual connection status without inventing store metrics. */
export function SllStoreStatusCard() {
  return (
    <section
      aria-labelledby="sll-store-status-title"
      className={cn(panelCard, 'gap-4 sm:flex-row sm:items-center')}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-link">
        <Store aria-hidden="true" className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="mb-2 inline-flex rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
          Shopee
        </span>
        <h2 id="sll-store-status-title" className={sectionTitleClass}>
          Situação da sua loja
        </h2>
        <p className="mt-1 text-body text-pretty text-muted-foreground">
          Check your store connection and the next steps in My stores. Sales data is available only
          after a connection is confirmed.
        </p>
      </div>
      <Button asChild className="w-full sm:w-auto sm:max-w-52" variant="default">
        <Link href="/sll/minhas-lojas">
          Ver situação das lojas <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

/** Só mostra o atalho interno à Loja Pronta quando a conta também tem esse produto. */
export function SllNextPathCard({ hasStoreAccess }: { hasStoreAccess: boolean }) {
  if (!hasStoreAccess) return null;

  return (
    <section aria-labelledby="sll-next-path-title" className={cn(panelCard, 'gap-3')}>
      <h2 id="sll-next-path-title" className={sectionTitleClass}>
        Você também tem acesso à Loja Pronta
      </h2>
      <p className="text-body text-pretty text-muted-foreground">
        Acesse a área da Loja Pronta para montar sua loja na Shopee, passo a passo, pela plataforma.
      </p>
      <Button asChild variant="default" className="w-full sm:w-fit">
        <Link href="/loja-pronta">
          Acessar Loja Pronta <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

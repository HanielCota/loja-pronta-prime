import type { ComponentProps } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, GraduationCap } from 'lucide-react';
import { SllAreaFrame, SllPage } from '@/features/sll/sll-area-shell';
import type { NavbarAccount } from '@/features/member/components/member-navbar';
import { cn } from '@/lib/utils';

type Section = { slug: string; title: string };

function CourseNavigation({
  stages,
  hasPri,
  disclosure = false,
}: {
  stages: Section[];
  hasPri: boolean;
  disclosure?: boolean;
}) {
  const navigation = (
    <nav aria-label="Seções do curso do Zé Mauro" className="flex flex-col gap-2">
      {[{ slug: '', title: 'Meu curso' }, ...stages].map((stage) => (
        <Link
          key={stage.slug}
          href={`/ze-mauro${stage.slug ? `#${stage.slug}` : ''}`}
          className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <BookOpen aria-hidden="true" className="size-5 shrink-0 text-link" />
          {stage.title}
        </Link>
      ))}
      {hasPri ? (
        <Link
          href="/sll"
          className="mt-4 flex min-h-11 items-center gap-3 rounded-2xl border-t border-border px-3 py-2 text-sm text-link focus-visible:outline-2 focus-visible:outline-ring"
        >
          <GraduationCap aria-hidden="true" className="size-5 shrink-0" />
          Ir para o curso da Pri
        </Link>
      ) : null}
    </nav>
  );
  if (!disclosure) return navigation;
  return (
    <details
      className={cn(
        'group rounded-card bg-card p-4 shadow-card forced-colors:border forced-colors:border-[CanvasText]',
      )}
    >
      <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <BookOpen aria-hidden="true" className="size-5 text-link" />
        <span className="flex-1">Seções do curso</span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 group-open:rotate-180 motion-safe:transition-transform"
        />
      </summary>
      <div className="pt-3">{navigation}</div>
    </details>
  );
}

export function ZeCourseShell({
  stages,
  hasPri,
  account,
  ...props
}: ComponentProps<typeof SllPage> & {
  account: NavbarAccount;
  stages: Section[];
  hasPri: boolean;
}) {
  return (
    <SllAreaFrame
      account={account}
      hasChoice={props.hasChoice}
      courseArea={{ href: '/ze-mauro', label: 'Curso Zé Mauro' }}
      navigation={{
        label: 'Navegação do curso do Zé Mauro',
        rail: <CourseNavigation stages={stages} hasPri={hasPri} />,
        disclosure: <CourseNavigation stages={stages} hasPri={hasPri} disclosure />,
      }}
    >
      <SllPage {...props} />
    </SllAreaFrame>
  );
}

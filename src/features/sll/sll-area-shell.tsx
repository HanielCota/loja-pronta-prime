import type { ComponentProps } from 'react';
import { AreaShell } from '@/features/member/components/area-shell';
import { SllSidebar } from './sll-sidebar';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Acrescenta a navegação do SLL sem alterar a moldura dos outros produtos. `currentSection`: o
 * link do menu que representa esta página quando o endereço dela não está no menu (a aula).
 */
export function SllAreaShell({
  currentSection,
  backLink,
  ...props
}: Omit<ComponentProps<typeof AreaShell>, 'area' | 'sidebar'> & {
  currentSection?: string | undefined;
  backLink?: { href: string; label: string } | undefined;
}) {
  return (
    <>
      <a
        href="#sll-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-6 focus:py-3 focus:text-body focus:text-link focus:shadow-card focus:outline-2 focus:outline-ring"
      >
        Pular para o conteúdo
      </a>
      <AreaShell
        {...props}
        area="sll"
        contentId="sll-content"
        header={
          backLink ? (
            <>
              <Button
                asChild
                className="-ml-2 w-fit px-2 text-sm whitespace-normal"
                size="inline"
                variant="ghost"
              >
                <Link href={backLink.href}>
                  <ArrowLeft aria-hidden="true" />
                  {backLink.label}
                </Link>
              </Button>
              <h1 className="text-title font-semibold text-balance sm:text-title-lg">
                {props.title}
              </h1>
              {props.intro ? (
                <p className="max-w-[60ch] text-body text-pretty text-muted-foreground">
                  {props.intro}
                </p>
              ) : null}
            </>
          ) : (
            props.header
          )
        }
        sidebar={<SllSidebar currentSection={currentSection} />}
      />
    </>
  );
}

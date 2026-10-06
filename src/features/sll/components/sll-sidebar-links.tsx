'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  CirclePlay,
  GraduationCap,
  LayoutDashboard,
  Store,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SllCopy } from '../copy';

type NavItem = { href: string; label: string; icon: typeof Store; exact?: boolean };

// Altura mínima, não fixa: nome de etapa comprido quebra a linha em vez de vazar do item.
const itemClass =
  'group flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-3 py-3 text-body outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150';

export function SllSidebarLinks({
  stages,
  copy,
  currentSection,
}: {
  stages: Array<{ href: string; label: string }>;
  copy: SllCopy;
  /** A seção desta página quando o endereço não está no menu (a aula: a etapa ou a lista). */
  currentSection?: string | undefined;
}) {
  const pathname = usePathname();
  const operation: NavItem[] = [
    { href: '/sll', label: copy.sidebarPanel, icon: LayoutDashboard, exact: true },
    { href: '/sll/minhas-lojas', label: copy.sidebarStores, icon: Store },
  ];
  const learning: NavItem[] = [
    { href: '/sll/comece-aqui', label: copy.sidebarWelcome, icon: CirclePlay },
    { href: '/sll/metodo', label: copy.sidebarMethod, icon: BookOpen },
    { href: '/sll/recursos', label: copy.sidebarResources, icon: Wrench },
    { href: '/sll/cursos', label: copy.sidebarCourses, icon: GraduationCap },
  ];
  const section = currentSection ?? pathname;
  // Fora do Método, a lista curta deixa os outros destinos à vista, como no site de referência.
  const showStages = section.startsWith('/sll/metodo') || section === '/sll/recursos';
  const currentLabel = (
    [...operation, ...learning, ...stages].find((item) => item.href === section) ??
    learning.find((item) => section.startsWith(`${item.href}/`))
  )?.label;
  /**
   * O realce e o `aria-current` vêm da mesma conta, pra o leitor de tela ouvir o que a tela mostra:
   * "page" no link desta página; "true" no link da seção em que ela está (a etapa de uma aula, o
   * Método numa etapa, Cursos num curso).
   */
  const currentOf = (item: { href: string; exact?: boolean }): 'page' | 'true' | undefined => {
    if (pathname === item.href) return 'page';
    if (section === item.href) return 'true';
    if (!item.exact && section.startsWith(`${item.href}/`)) return 'true';
    return undefined;
  };

  const navigation = (
    <nav aria-label="Seções do SLL" className="flex flex-col gap-6">
      <div>
        <p className="px-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Minha operação
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {operation.map((item) => (
            <li key={item.href}>
              <Link
                aria-current={currentOf(item)}
                className={cn(
                  itemClass,
                  currentOf(item) &&
                    'bg-primary-soft font-semibold text-link hover:bg-primary-soft',
                )}
                href={item.href}
              >
                <item.icon
                  aria-hidden="true"
                  className="size-5 shrink-0 motion-safe:transition-transform motion-safe:duration-200 group-hover:motion-safe:scale-110"
                />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="px-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Aprender
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {learning.map((item) => (
            <li key={item.href}>
              <Link
                aria-current={currentOf(item)}
                className={cn(
                  itemClass,
                  currentOf(item) &&
                    'bg-primary-soft font-semibold text-link hover:bg-primary-soft',
                )}
                href={item.href}
              >
                <item.icon
                  aria-hidden="true"
                  className="size-5 shrink-0 motion-safe:transition-transform motion-safe:duration-200 group-hover:motion-safe:scale-110"
                />
                {item.label}
              </Link>
              {item.href === '/sll/metodo' && showStages && stages.length ? (
                <ul className="mt-2 ml-5 flex flex-col gap-1 border-l border-border pl-2">
                  {stages.map((stage) => (
                    <li key={stage.href}>
                      <Link
                        aria-current={currentOf(stage)}
                        className={cn(
                          itemClass,
                          'min-h-11 text-sm',
                          currentOf(stage)
                            ? 'bg-primary-soft font-semibold text-link hover:bg-primary-soft'
                            : 'text-muted-foreground',
                        )}
                        href={stage.href}
                      >
                        {stage.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );

  return (
    <>
      <aside
        className="hidden rounded-card bg-card p-3 shadow-card lg:block lg:min-h-[calc(100dvh-9rem)] lg:self-stretch forced-colors:border forced-colors:border-[CanvasText]"
        aria-label="Navegação do SLL"
      >
        {/* O cartão vai até o fim do conteúdo; só o menu acompanha a rolagem. */}
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          {navigation}
        </div>
      </aside>
      <details
        key={pathname}
        className="group rounded-card bg-card p-4 shadow-card lg:hidden forced-colors:border forced-colors:border-[CanvasText]"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-body font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <BookOpen aria-hidden="true" className="size-5 shrink-0 text-link" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            Seções do SLL
            {currentLabel ? (
              <span className="text-sm font-normal text-muted-foreground">{currentLabel}</span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 group-open:rotate-180 motion-safe:transition-transform"
          />
        </summary>
        <div className="pt-3">{navigation}</div>
      </details>
    </>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CirclePlay } from 'lucide-react';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { filterLibraryModules, type LibraryModule } from '../library-search';
import { cn } from '@/lib/utils';

export function SllKnowledgeLibrary({
  modules,
  initialQuery = '',
}: {
  modules: LibraryModule[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const pathname = usePathname();
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const results = useMemo(
    () => filterLibraryModules(modules, normalizedQuery),
    [modules, normalizedQuery],
  );
  const resultCount = results.reduce((count, module) => count + module.lessons.length, 0);

  return (
    <section className="flex flex-col gap-6" aria-labelledby="library-title">
      <div className="flex flex-col gap-3">
        <h2 id="library-title" className="scroll-mt-6 text-body font-semibold text-foreground">
          {modules.reduce((count, module) => count + module.lessons.length, 0)} aulas em{' '}
          {modules.length} categorias
        </h2>
        <form
          action={`${pathname}#library-title`}
          method="get"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <FloatingLabelInput
              autoComplete="off"
              id="library-search"
              label="Buscar aula ou tema"
              name="q"
              maxLength={200}
              aria-describedby="library-search-help"
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              value={query}
            />
          </div>
          <Button type="submit" variant="soft" className="sm:w-auto">
            Buscar
          </Button>
          {query ? (
            <Button asChild size="inline" variant="ghost" className="px-3">
              <Link href={`${pathname}#library-title`} onClick={() => setQuery('')}>
                Limpar busca
              </Link>
            </Button>
          ) : null}
        </form>
        <p id="library-search-help" className="text-sm text-muted-foreground">
          Ex.: cupom, etiqueta ou avaliações. Você pode buscar sem acentos.
        </p>
        {normalizedQuery ? (
          <p className="text-body text-muted-foreground">
            {resultCount} {resultCount === 1 ? 'aula encontrada' : 'aulas encontradas'}
          </p>
        ) : null}
      </div>
      {/* Sempre no código, pra o leitor de tela anunciar quantas aulas a busca achou. */}
      <LiveRegion>
        {normalizedQuery
          ? `${resultCount} ${resultCount === 1 ? 'aula encontrada' : 'aulas encontradas'}`
          : null}
      </LiveRegion>
      {results.length ? (
        results.map((module) => (
          <section key={module.id} aria-label={module.title}>
            <div className="mb-4 flex flex-wrap items-baseline gap-3">
              <h3 className="text-xl leading-snug font-semibold text-balance text-foreground">
                {module.title}
              </h3>
              <span className="text-sm text-muted-foreground">
                {module.lessons.length} {module.lessons.length === 1 ? 'aula' : 'aulas'}
              </span>
            </div>
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] items-start gap-4">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    className={cn(
                      panelCard,
                      'group gap-3 p-5 text-body wrap-anywhere text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors sm:p-5',
                    )}
                    href={`/sll/aula/${lesson.id}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <CirclePlay aria-hidden="true" className="size-6 shrink-0 text-link" />
                      {lesson.completed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium text-progress-text">
                          <Check aria-hidden="true" className="size-4 shrink-0" /> Concluída
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-balance">{lesson.title}</span>
                      {lesson.description ? (
                        <span className="mt-1 block text-muted-foreground">
                          {lesson.description}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex min-h-11 items-center gap-2 font-semibold text-link">
                      Abrir aula{' '}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-5 shrink-0 motion-safe:transition-transform group-hover:motion-safe:translate-x-1"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))
      ) : (
        <p className="text-body text-muted-foreground">
          Nenhuma aula encontrada. Tente outra palavra.
        </p>
      )}
    </section>
  );
}

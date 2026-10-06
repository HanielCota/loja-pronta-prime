'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';

type LibraryModule = {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string; description: string | null; completed: boolean }>;
};

export function SllKnowledgeLibrary({ modules }: { modules: LibraryModule[] }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const results = useMemo(
    () =>
      modules
        .map((module) => ({
          ...module,
          lessons: module.lessons.filter((lesson) =>
            `${module.title} ${lesson.title} ${lesson.description ?? ''}`
              .toLocaleLowerCase('pt-BR')
              .includes(normalizedQuery),
          ),
        }))
        .filter((module) => module.lessons.length > 0),
    [modules, normalizedQuery],
  );
  const resultCount = results.reduce((count, module) => count + module.lessons.length, 0);

  return (
    <section className="flex flex-col gap-5" aria-labelledby="library-title">
      <h2 id="library-title" className="text-title font-semibold text-foreground">
        {modules.reduce((count, module) => count + module.lessons.length, 0)} aulas em{' '}
        {modules.length} categorias
      </h2>
      <FloatingLabelInput
        autoComplete="off"
        id="library-search"
        label="Buscar aula ou tema"
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        value={query}
      />
      {/* Sempre no código, pra o leitor de tela anunciar quantas aulas a busca achou. */}
      <LiveRegion>
        {normalizedQuery
          ? `${resultCount} ${resultCount === 1 ? 'aula encontrada' : 'aulas encontradas'}`
          : null}
      </LiveRegion>
      {results.length ? (
        results.map((module) => (
          <section key={module.id} aria-label={module.title}>
            <h3 className="mb-2 text-title font-semibold text-foreground">{module.title}</h3>
            <ol className="flex flex-col divide-y divide-border rounded-card border border-border bg-card shadow-card forced-colors:border forced-colors:border-[CanvasText]">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    className="flex min-h-14 items-center gap-3 px-4 py-3 text-body text-foreground outline-none first:rounded-t-card last:rounded-b-card hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    href={`/sll/aula/${lesson.id}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{lesson.title}</span>
                      {lesson.description ? (
                        <span className="mt-1 block text-muted-foreground">
                          {lesson.description}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-link" />
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

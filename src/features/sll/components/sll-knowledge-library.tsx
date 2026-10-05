'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

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

  return (
    <section className="flex flex-col gap-5" aria-labelledby="library-title">
      <h2 id="library-title" className="text-title font-semibold text-foreground">
        {modules.reduce((count, module) => count + module.lessons.length, 0)} aulas em{' '}
        {modules.length} categorias
      </h2>
      <label className="flex min-h-12 items-center gap-3 rounded-field border border-input bg-card px-4 text-muted-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        <Search aria-hidden="true" className="size-5 shrink-0" />
        <span className="sr-only">Buscar aulas</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar aula ou tema"
          type="search"
          value={query}
        />
      </label>
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
        <p aria-live="polite" className="text-body text-muted-foreground">
          Nenhuma aula encontrada. Tente outra palavra.
        </p>
      )}
    </section>
  );
}

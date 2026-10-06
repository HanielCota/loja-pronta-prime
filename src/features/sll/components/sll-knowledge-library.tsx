'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CirclePlay } from 'lucide-react';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';

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
    <section className="flex flex-col gap-8" aria-labelledby="library-title">
      <div className="flex flex-col gap-3">
        <h2 id="library-title" className="text-body font-semibold text-foreground">
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
        <p className="text-sm text-muted-foreground">Ex.: cupom, etiqueta ou avaliações.</p>
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
              <h3 className="text-title font-semibold text-foreground">{module.title}</h3>
              <span className="text-sm text-muted-foreground">
                {module.lessons.length} {module.lessons.length === 1 ? 'aula' : 'aulas'}
              </span>
            </div>
            <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    className={`${panelCard} group h-full gap-4 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors`}
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
                    <span className="mt-auto flex min-h-11 items-center gap-2 pt-2 font-semibold text-link">
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

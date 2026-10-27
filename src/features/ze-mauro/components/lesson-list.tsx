import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { zeLessonVideo } from '../course';

type Lesson = { id: string; title: string; blocks: Array<{ kind: string; data: unknown }> };

export function ZeLessonList({
  lessons,
  completed,
  currentId,
}: {
  lessons: Lesson[];
  completed: Set<string>;
  currentId?: string;
}) {
  return (
    <ol className="flex flex-col divide-y divide-border border-t border-border">
      {lessons.map((lesson, index) => {
        const available = Boolean(zeLessonVideo(lesson.blocks));
        const content = (
          <>
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-sm text-muted-foreground">
              <span className="sr-only">Aula </span>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{lesson.title}</span>
              {!available ? <span className="text-sm text-muted-foreground">Em breve</span> : null}
            </span>
            {available ? (
              completed.has(lesson.id) ? (
                <Check aria-label="Concluída" className="size-5 shrink-0 text-progress-text" />
              ) : (
                <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-link" />
              )
            ) : null}
          </>
        );
        const className = 'flex min-h-14 items-center gap-3 rounded-2xl px-2 py-3 text-body';
        return (
          <li key={lesson.id}>
            {available ? (
              <Link
                href={`/ze-mauro/aula/${lesson.id}`}
                aria-current={currentId === lesson.id ? 'page' : undefined}
                className={`${className} text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors`}
              >
                {content}
              </Link>
            ) : (
              <div className={`${className} text-muted-foreground`}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

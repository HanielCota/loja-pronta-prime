import { FileText, Link2 } from 'lucide-react';
import { SllLessonVideo } from '@/features/sll/components/sll-lesson-video';
import { panelCard } from '@/features/member/components/area-shell';

export type DraftPreviewBlock = {
  id: string;
  kind: 'text' | 'link' | 'video' | 'file' | 'image';
  data: Record<string, string>;
};

/** Mostra o vídeo conferido antes de salvar, mantendo links e arquivos como informações. */
export function LessonDraftPreview({
  currentLessonId,
  siblingLessons,
  title,
  description,
  blocks,
  changed,
}: {
  currentLessonId: string;
  siblingLessons: Array<{ id: string; title: string }>;
  title: string;
  description: string;
  blocks: DraftPreviewBlock[];
  changed: boolean;
}) {
  const firstVideo = blocks.find((block) => block.kind === 'video');
  return (
    <section className={`${panelCard} gap-4`} aria-labelledby="draft-preview-heading">
      <div>
        <p className="text-sm font-semibold text-link">Prévia da aluna</p>
        <h3 id="draft-preview-heading" className="text-title font-semibold text-foreground">
          {title.trim() || 'Aula sem título'}
        </h3>
        <p className="mt-1 text-body text-muted-foreground">
          {changed
            ? 'Você está vendo as alterações antes de salvar.'
            : 'Confira como o conteúdo está organizado.'}
        </p>
      </div>
      {firstVideo ? (
        <SllLessonVideo data={firstVideo.data} title={title.trim() || 'Aula sem título'} />
      ) : null}
      {description.trim() ? (
        <p className="text-body whitespace-pre-wrap text-foreground">{description}</p>
      ) : null}
      <div className="flex flex-col gap-4">
        {blocks.map((block) => {
          if (block.kind === 'video')
            return block.id !== firstVideo?.id || block.data.note?.trim() ? (
              <div className="flex flex-col gap-2" key={block.id}>
                {block.id !== firstVideo?.id ? (
                  <SllLessonVideo data={block.data} title={title.trim() || 'Aula sem título'} />
                ) : null}
                {block.data.note?.trim() ? (
                  <p className="text-body whitespace-pre-wrap text-foreground">{block.data.note}</p>
                ) : null}
              </div>
            ) : null;
          if (block.kind === 'text')
            return block.data.text?.trim() ? (
              <p className="text-body whitespace-pre-wrap text-foreground" key={block.id}>
                {block.data.text}
              </p>
            ) : null;
          if (block.kind === 'link')
            return (
              <div className="flex flex-col gap-1" key={block.id}>
                <p className="flex items-center gap-2 text-body font-semibold text-link">
                  <Link2 aria-hidden="true" className="size-5" />
                  {block.data.label?.trim() || 'Novo link'}
                </p>
                {block.data.note?.trim() ? (
                  <p className="text-body whitespace-pre-wrap text-foreground">{block.data.note}</p>
                ) : null}
              </div>
            );
          if (block.kind === 'file')
            return (
              <p className="flex items-center gap-2 text-body text-foreground" key={block.id}>
                <FileText aria-hidden="true" className="size-5 text-link" />
                {block.data.fileName?.trim() || 'Arquivo ainda não enviado'}
              </p>
            );
          return block.data.alt?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={block.data.alt}
              className="max-w-full rounded-2xl border border-border object-contain"
              key={block.id}
              src={`/api/admin/learning-content/draft-media/${block.id}`}
            />
          ) : null;
        })}
      </div>
      {!firstVideo && !description.trim() && blocks.length === 0 ? (
        <p className="text-body text-muted-foreground">Esta aula ainda não tem conteúdo.</p>
      ) : null}
      {siblingLessons.length > 0 ? (
        <aside className="border-t border-border pt-4" aria-label="Sequência de aulas na prévia">
          <h4 className="text-body font-semibold text-foreground">Aulas deste módulo</h4>
          <ol className="mt-3 flex flex-col divide-y divide-border">
            {siblingLessons.map((lesson, index) => (
              <li
                aria-current={lesson.id === currentLessonId ? 'step' : undefined}
                className={`flex min-h-11 items-center gap-3 py-2 text-body ${lesson.id === currentLessonId ? 'font-semibold text-link' : 'text-foreground'}`}
                key={lesson.id}
              >
                <span aria-hidden="true" className="w-6 shrink-0 text-muted-foreground">
                  {index + 1}
                </span>
                <span>
                  {lesson.id === currentLessonId ? title.trim() || 'Aula sem título' : lesson.title}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
    </section>
  );
}

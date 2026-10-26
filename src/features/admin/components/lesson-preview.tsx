import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { SllLessonVideo } from '@/features/sll/components/sll-lesson-video';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';

type PreviewBlock = {
  id: string;
  kind: 'text' | 'video' | 'link' | 'file' | 'image';
  data: Record<string, string>;
};

export function LessonPreview({
  lesson,
}: {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number | null;
    status: 'draft' | 'published';
    module: {
      title: string;
      stage: { title: string; track: { title: string } };
      lessons: Array<{
        id: string;
        title: string;
        number: number;
        status: 'draft' | 'published';
        current: boolean;
      }>;
    };
    blocks: PreviewBlock[];
  };
}) {
  const firstVideo = lesson.blocks.find((block) => block.kind === 'video');
  return (
    <div className="flex flex-col gap-6">
      <Button asChild className="w-fit" variant="ghost">
        <Link href="/admin?area=welcome">
          <ArrowLeft aria-hidden="true" />
          Voltar ao conteúdo
        </Link>
      </Button>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className={cn(panelCard, '!p-5 sm:!p-8')} aria-labelledby="lesson-preview-title">
          <p className="text-sm text-muted-foreground">
            {lesson.module.stage.track.title} · {lesson.module.stage.title} · {lesson.module.title}
          </p>
          {firstVideo ? (
            <div className="mt-5">
              <SllLessonVideo data={firstVideo.data} title={lesson.title} />
            </div>
          ) : null}
          <p className="mt-5 text-sm text-muted-foreground">
            Aula {lesson.module.lessons.find((item) => item.current)?.number} de{' '}
            {lesson.module.lessons.length}
          </p>
          <h2
            className="mt-1 text-title font-semibold text-balance text-foreground sm:text-title-lg"
            id="lesson-preview-title"
          >
            {lesson.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Prévia como aluna · {lesson.status === 'published' ? 'Publicado' : 'Rascunho'}
            {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ''}
          </p>
          {lesson.description ? (
            <p className="mt-4 max-w-[70ch] text-body text-pretty text-foreground">
              {lesson.description}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
            {lesson.blocks.map((block) => {
              if (block.kind === 'video') {
                const files = lesson.blocks.filter(
                  (item) => item.kind === 'file' && item.data.attachedTo === block.id,
                );
                return block.id !== firstVideo?.id || block.data.note || files.length ? (
                  <div className="flex flex-col gap-2" key={block.id}>
                    {block.id !== firstVideo?.id ? (
                      <SllLessonVideo data={block.data} title={lesson.title} />
                    ) : null}
                    {block.data.note ? (
                      <p className="text-body whitespace-pre-wrap text-foreground">
                        {block.data.note}
                      </p>
                    ) : null}
                    {files.map((file) => (
                      <a
                        className="inline-flex min-h-11 items-center gap-2 text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        href={`/api/admin/learning-content/draft-media/${file.id}`}
                        key={file.id}
                      >
                        <Download aria-hidden="true" className="size-5" />
                        Baixar {file.data.fileName}
                      </a>
                    ))}
                  </div>
                ) : null;
              }
              if (block.kind === 'text') {
                return (
                  <p className="text-body whitespace-pre-wrap text-foreground" key={block.id}>
                    {block.data.text}
                  </p>
                );
              }
              if (block.kind === 'link' && block.data.url) {
                return (
                  <div className="flex flex-col gap-2" key={block.id}>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      href={block.data.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink aria-hidden="true" className="size-5" />
                      {block.data.label || block.data.url}
                    </a>
                    {block.data.note ? (
                      <p className="text-body whitespace-pre-wrap text-foreground">
                        {block.data.note}
                      </p>
                    ) : null}
                    {lesson.blocks
                      .filter((item) => item.kind === 'file' && item.data.attachedTo === block.id)
                      .map((file) => (
                        <a
                          className="inline-flex min-h-11 items-center gap-2 text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          href={`/api/admin/learning-content/draft-media/${file.id}`}
                          key={file.id}
                        >
                          <Download aria-hidden="true" className="size-5" />
                          Baixar {file.data.fileName}
                        </a>
                      ))}
                  </div>
                );
              }
              if (block.kind === 'file' && block.data.fileName) {
                if (
                  block.data.attachedTo &&
                  lesson.blocks.some((item) => item.id === block.data.attachedTo)
                )
                  return null;
                return (
                  <p key={block.id}>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      href={`/api/admin/learning-content/draft-media/${block.id}`}
                    >
                      <Download aria-hidden="true" className="size-5" />
                      Baixar {block.data.fileName}
                    </a>
                  </p>
                );
              }
              if (block.kind === 'image' && block.data.alt) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={block.data.alt}
                    className="max-h-[32rem] max-w-full self-start rounded-2xl border border-border object-contain forced-colors:border forced-colors:border-[CanvasText]"
                    height={720}
                    key={block.id}
                    src={`/api/admin/learning-content/draft-media/${block.id}`}
                    width={1280}
                  />
                );
              }
              return null;
            })}
          </div>
          {lesson.blocks.length === 0 && !lesson.description ? (
            <p className="mt-6 border-t border-border pt-5 text-body text-muted-foreground">
              Esta aula ainda não tem conteúdo.
            </p>
          ) : null}
        </section>
        <aside className={cn(panelCard, '!p-5 sm:!p-6')} aria-label="Aulas deste módulo">
          <h3 className="text-body font-semibold text-foreground">Aulas deste módulo</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {lesson.module.lessons.length} {lesson.module.lessons.length === 1 ? 'aula' : 'aulas'}
          </p>
          <ol className="mt-4 flex flex-col gap-2">
            {lesson.module.lessons.map((item) => (
              <li key={item.id}>
                <Link
                  aria-current={item.current ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-sm outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    item.current ? 'bg-primary-soft text-link' : 'text-foreground',
                  )}
                  href={`/admin/preview/${item.id}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border">
                    {item.number}
                  </span>
                  <span className="min-w-0 flex-1">{item.title}</span>
                  {item.status === 'draft' ? (
                    <span className="shrink-0 text-muted-foreground">Prévia</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

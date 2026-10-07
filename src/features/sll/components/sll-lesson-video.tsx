import { CirclePlay } from 'lucide-react';
import { pandaVideoEmbedUrl } from '../panda-video';

/** Mesmo player na aula e nas prévias, sem carregar o catálogo inteiro no navegador. */
export function SllLessonVideo({ data, title }: { data: Record<string, unknown>; title: string }) {
  const src = pandaVideoEmbedUrl(data);
  if (!src)
    return (
      <section
        className="flex items-start gap-3 rounded-card border border-border bg-muted p-4 forced-colors:border forced-colors:border-[CanvasText]"
        aria-label="Vídeo da aula"
      >
        <CirclePlay aria-hidden="true" className="mt-1 size-6 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-body font-semibold text-foreground">Vídeo em breve</h3>
          <p className="text-sm text-muted-foreground">
            O vídeo desta aula ainda não está disponível.
          </p>
        </div>
      </section>
    );

  return (
    <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-muted forced-colors:border-[CanvasText]">
      <iframe
        key={src}
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-presentation"
        src={src}
        title={`Vídeo da aula: ${title}`}
      />
    </div>
  );
}

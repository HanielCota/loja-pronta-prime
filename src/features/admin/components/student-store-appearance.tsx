import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandKitPreview } from '@/features/brand/components/brand-kit-preview';
import { panelCard } from '@/features/member/components/area-shell';
import type { StoreJourneyImage } from '../store-journey';

/** Mostra a marca e as imagens que a aluna salvou, sem criar nem escolher nenhuma. */
export function StudentStoreAppearance({
  name,
  description,
  logoSrc,
  images,
}: {
  name: string | null;
  description: string | null;
  logoSrc: string | null;
  images: StoreJourneyImage[];
}) {
  return (
    <>
      <section aria-labelledby="store-appearance" className={`${panelCard} gap-5`}>
        <div>
          <h2 id="store-appearance" className="text-title font-semibold">
            Como a loja está ficando
          </h2>
          <p className="mt-2 text-body text-pretty text-muted-foreground">
            Prévia ilustrativa com a marca que a aluna salvou. Não quer dizer que a loja já está na
            Shopee. As fotos dos produtos chegam em breve.
          </p>
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-4 border-b border-border bg-muted p-5">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt=""
                  width={80}
                  height={80}
                  className="size-20 shrink-0 rounded-full border border-border bg-card object-contain"
                />
              ) : null}
              <p className="min-w-0 text-body font-semibold wrap-anywhere">
                {name ?? 'Nome da loja ainda não escolhido'}
              </p>
            </div>
            <p className="p-5 text-body wrap-anywhere whitespace-pre-wrap">
              {description ?? 'Texto da loja ainda não escrito'}
            </p>
          </div>
          {logoSrc ? (
            <figure className="flex flex-col gap-3">
              <BrandKitPreview logoSrc={logoSrc} />
              <figcaption className="text-sm text-pretty text-muted-foreground">
                Embalagem ilustrativa com o logo salvo: caixa, adesivo e sacola.
              </figcaption>
            </figure>
          ) : (
            <p className="text-body text-pretty text-muted-foreground">
              A prévia da embalagem aparece quando a aluna salvar um logo.
            </p>
          )}
        </div>
      </section>
      <section aria-labelledby="store-images" className={`${panelCard} gap-5`}>
        <div>
          <h2 id="store-images" className="text-title font-semibold">
            Imagens salvas ({images.length})
          </h2>
          <p className="mt-2 text-body text-pretty text-muted-foreground">
            Logos que a aluna criou ou enviou. Abra uma imagem para ver no tamanho original.
          </p>
        </div>
        {images.length ? (
          <ol className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => (
              <li
                key={image.src}
                className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt={`Logo salvo ${index + 1}`}
                  width={320}
                  height={320}
                  loading="lazy"
                  className="aspect-square w-full rounded-field border border-border object-contain"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body font-semibold">Imagem {index + 1}</p>
                  {image.selected ? (
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-link">
                      Logo escolhido
                    </span>
                  ) : null}
                  {image.uploaded ? (
                    <span className="text-sm text-muted-foreground">Enviada pela aluna</span>
                  ) : null}
                </div>
                <Button asChild size="inline" variant="soft" className="w-fit">
                  <a href={image.src} target="_blank" rel="noreferrer">
                    Ver imagem inteira
                    <ExternalLink aria-hidden="true" />
                    <span className="sr-only"> {index + 1} (abre em outra aba)</span>
                  </a>
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma imagem salva ainda.</p>
        )}
      </section>
    </>
  );
}

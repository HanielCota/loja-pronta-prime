import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandKitPreview } from '@/features/brand/components/brand-kit-preview';
import { panelCard } from '@/features/member/components/area-shell';
import type { StoreJourneyImage } from '../store-journey';

/** Show the student's saved visual assets without creating or selecting any images. */
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
            Store appearance
          </h2>
          <p className="mt-2 text-body text-pretty text-muted-foreground">
            Illustrative preview using the student's saved brand. This does not confirm publication
            on Shopee. Product images are not available in the platform yet.
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
                {name ?? 'Store name not chosen yet'}
              </p>
            </div>
            <p className="p-5 text-body wrap-anywhere whitespace-pre-wrap">
              {description ?? 'Store description not written yet'}
            </p>
          </div>
          {logoSrc ? (
            <figure className="flex flex-col gap-3">
              <BrandKitPreview logoSrc={logoSrc} />
              <figcaption className="text-sm text-pretty text-muted-foreground">
                Illustrative packaging with the saved logo: box, sticker, and bag.
              </figcaption>
            </figure>
          ) : (
            <p className="text-body text-pretty text-muted-foreground">
              The packaging preview will appear after the student saves a logo.
            </p>
          )}
        </div>
      </section>
      <section aria-labelledby="store-images" className={`${panelCard} gap-5`}>
        <div>
          <h2 id="store-images" className="text-title font-semibold">
            Saved images ({images.length})
          </h2>
          <p className="mt-2 text-body text-pretty text-muted-foreground">
            Logos created or uploaded by the student. Open an image to inspect it at full size.
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
                  alt={`Saved logo ${index + 1}`}
                  width={320}
                  height={320}
                  loading="lazy"
                  className="aspect-square w-full rounded-field border border-border object-contain"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body font-semibold">Image {index + 1}</p>
                  {image.selected ? (
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-link">
                      Selected logo
                    </span>
                  ) : null}
                  {image.uploaded ? (
                    <span className="text-sm text-muted-foreground">Uploaded</span>
                  ) : null}
                </div>
                <Button asChild size="inline" variant="soft" className="w-fit">
                  <a href={image.src} target="_blank" rel="noreferrer">
                    View full image
                    <ExternalLink aria-hidden="true" />
                    <span className="sr-only"> {index + 1} (opens in a new tab)</span>
                  </a>
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">No store images have been saved yet.</p>
        )}
      </section>
    </>
  );
}

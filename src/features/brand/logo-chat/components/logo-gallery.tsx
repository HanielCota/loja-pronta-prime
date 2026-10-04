import { logoSrc } from './logo-src';

export type ChatLogo = { imageId: string; number: number };

/**
 * "Seus logos": todos os logos da conversa lado a lado, pra comparar e escolher sem rolar a
 * conversa. Tocar num abre ele grande (com "Usar esse logo"). Só com 2 ou mais.
 */
export function LogoGallery({
  logos,
  onOpen,
}: {
  logos: ChatLogo[];
  onOpen: (imageId: string) => void;
}) {
  if (logos.length < 2) return null;
  return (
    <section aria-labelledby="seus-logos" className="flex flex-col gap-3">
      <h2 id="seus-logos" className="text-lg font-semibold">
        Seus logos ({logos.length})
      </h2>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-2">
        {logos.map((logo) => (
          <li key={logo.imageId} className="shrink-0">
            <button
              type="button"
              onClick={() => onOpen(logo.imageId)}
              className="flex flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc(logo.imageId)}
                alt=""
                width={112}
                height={112}
                className="size-24 rounded-2xl border border-border bg-card sm:size-28"
              />
              <span className="text-body font-medium">Logo {logo.number}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

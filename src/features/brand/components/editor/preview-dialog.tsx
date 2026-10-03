'use client';

import { XIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { LogoMockups } from '../logo-mockups';

/** Tamanhos em que o logo aparece de verdade: a foto do perfil, a lista de lojas, a aba. */
const SIZES = [
  { px: 160, label: 'Perfil da loja' },
  { px: 64, label: 'Lista de lojas' },
  { px: 32, label: 'Bem pequeno' },
];

/**
 * "Pré-visualizar": o logo como a cliente vai ver. No círculo da Shopee, em tamanhos pequenos
 * (pra conferir se o nome ainda dá pra ler) e na caixa e no cartão. Janela nativa do navegador
 * (`<dialog>`): o foco fica dentro dela e Esc fecha.
 */
export function PreviewDialog({
  open,
  src,
  storeName,
  onClose,
}: {
  open: boolean;
  src: string | null;
  storeName: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="previa-titulo"
      onClose={onClose}
      className="m-auto w-[min(720px,calc(100vw-32px))] rounded-card bg-card p-0 text-foreground shadow-card backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <h2 id="previa-titulo" className="flex-1 text-xl font-semibold">
            Como seu logo aparece
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-11 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            <XIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
        {src ? (
          <>
            <section aria-labelledby="previa-tamanhos" className="flex flex-col gap-3">
              <h3 id="previa-tamanhos" className="text-body font-semibold">
                No círculo da Shopee, em vários tamanhos
              </h3>
              <ul className="flex flex-wrap items-end gap-6">
                {SIZES.map((size) => (
                  <li key={size.px} className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      width={size.px}
                      height={size.px}
                      style={{ width: size.px, height: size.px }}
                      className="rounded-full border border-border bg-card"
                    />
                    <span className="text-sm text-muted-foreground">
                      {size.label} ({size.px}px)
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-pretty text-muted-foreground">
                Se o nome some no tamanho pequeno, aumente a letra ou deixe o logo com menos coisas.
              </p>
            </section>
            <LogoMockups src={src} storeName={storeName} />
          </>
        ) : (
          <p className="text-body text-muted-foreground">Carregando…</p>
        )}
      </div>
    </dialog>
  );
}

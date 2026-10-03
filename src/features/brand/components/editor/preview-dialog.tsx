'use client';

import { LogoMockups } from '../logo-mockups';
import { EditorDialog } from './editor-dialog';

/** Tamanhos em que o logo aparece de verdade: a foto do perfil, a lista de lojas, a aba. */
const SIZES = [
  { px: 160, label: 'Perfil da loja' },
  { px: 64, label: 'Lista de lojas' },
  { px: 32, label: 'Bem pequeno' },
];

/**
 * "Pré-visualizar": o logo como a cliente vai ver. No círculo da Shopee, em tamanhos pequenos
 * (pra conferir se o nome ainda dá pra ler) e na caixa e no cartão.
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
  return (
    <EditorDialog open={open} title="Como seu logo aparece" onClose={onClose}>
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
    </EditorDialog>
  );
}

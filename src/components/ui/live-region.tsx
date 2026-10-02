import type { ReactNode } from 'react';

/**
 * Anúncio pra leitor de tela, invisível na tela. Fica sempre no código, mesmo vazio: regiões
 * criadas junto com o texto costumam não ser anunciadas (NVDA, JAWS, VoiceOver). Fora do fluxo
 * do layout (sr-only), então não ocupa espaço nem altera espaçamentos.
 */
export function LiveRegion({ children }: { children?: ReactNode }) {
  return (
    <span aria-live="polite" aria-atomic="true" className="sr-only">
      {children}
    </span>
  );
}

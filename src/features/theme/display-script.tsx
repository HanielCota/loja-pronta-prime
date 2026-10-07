'use client';

import { DISPLAY_SCRIPT } from './display';

/**
 * Aplica tamanho do texto, movimento e contraste antes da página aparecer. Vem no HTML do
 * servidor e roda na hora. Se o React recriar o <head> no navegador (depois de um erro de
 * hidratação, por exemplo), um <script> recriado nunca roda e o React avisa no console; por isso,
 * no navegador ele vira um bloco de texto (`text/plain`), que o React aceita. A diferença no
 * atributo é esperada: o script já rodou quando o React chega.
 */
export function DisplayPreferencesScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: DISPLAY_SCRIPT }}
      id="display-preferences"
      suppressHydrationWarning
      type={typeof window === 'undefined' ? undefined : 'text/plain'}
    />
  );
}

'use client';

import { useEffect } from 'react';

/**
 * Leva o foco pro título ao chegar numa etapa. Cada etapa é uma página nova: sem isso, o foco
 * cai no começo do documento e quem usa teclado ou leitor de tela precisa voltar a procurar a
 * pergunta. Só age quando o foco está "perdido" (no body), pra não roubar o de ninguém.
 */
export function FocusOnArrival({ targetId }: { targetId: string }) {
  useEffect(() => {
    if (document.activeElement && document.activeElement !== document.body) return;
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }, [targetId]);
  return null;
}

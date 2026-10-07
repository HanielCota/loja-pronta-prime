'use client';

import { useEffect, useState } from 'react';
import { getOnlineCount } from '../server/actions';

const REFRESH_MS = 30_000;

/**
 * O número de pessoas online ao lado de "Online agora" no menu, com o ponto verde. Lê ao abrir e
 * a cada 30s, só com a aba à vista. Não anuncia cada mudança no leitor de tela (seria barulho a
 * cada atualização): o número entra no nome do link.
 */
export function OnlineCountBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      getOnlineCount()
        .then((value) => {
          if (active) setCount(value);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  if (count === null) return null;
  return (
    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold text-foreground tabular-nums forced-colors:border forced-colors:border-[CanvasText]">
      {count > 0 ? <span aria-hidden="true" className="size-2 rounded-full bg-progress" /> : null}
      {count}
      <span className="sr-only">{count === 1 ? 'pessoa online' : 'pessoas online'}</span>
    </span>
  );
}

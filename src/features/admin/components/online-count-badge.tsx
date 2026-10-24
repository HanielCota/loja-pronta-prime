'use client';

import { useEffect, useState } from 'react';
import { getOnlineCount } from '../server/actions';

const REFRESH_MS = 30_000;
/** Leituras mais próximas que isso reaproveitam a anterior. */
const SHARED_MS = 5_000;

let shared: { at: number; count: Promise<number> } | null = null;

/**
 * O menu existe duas vezes na moldura (lateral no computador, recolhido no celular; uma fica
 * escondida pelo CSS). Sem isso, cada cópia pedia o número ao servidor a cada 30s.
 */
function readOnlineCount() {
  const now = Date.now();
  if (shared && now - shared.at < SHARED_MS) return shared.count;
  const count = getOnlineCount();
  shared = { at: now, count };
  // Uma falha não fica guardada: a próxima leitura tenta de novo.
  count.catch(() => {
    if (shared?.count === count) shared = null;
  });
  return count;
}

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
      readOnlineCount()
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

'use client';

import { useEffect, useState } from 'react';
import { getWaitingTicketCount } from '@/features/support-desk/server/actions';

const REFRESH_MS = 30_000;
const SHARED_MS = 5_000;

let shared: { at: number; count: Promise<number> } | null = null;

/** O menu existe duas vezes na moldura: as duas cópias dividem a mesma leitura. */
function readCount() {
  const now = Date.now();
  if (shared && now - shared.at < SHARED_MS) return shared.count;
  const count = getWaitingTicketCount();
  shared = { at: now, count };
  count.catch(() => {
    if (shared?.count === count) shared = null;
  });
  return count;
}

/**
 * Quantos chamados estão esperando o suporte, ao lado de "Chamados" no menu. Lê ao abrir e a cada
 * 30s, só com a aba à vista; o número entra no nome do link (sem anunciar cada mudança).
 */
export function TicketCountBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      readCount()
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

  if (!count) return null;
  return (
    <span className="ml-auto inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-semibold text-link tabular-nums forced-colors:border forced-colors:border-[CanvasText]">
      {count}
      <span className="sr-only">{count === 1 ? 'chamado aguardando' : 'chamados aguardando'}</span>
    </span>
  );
}

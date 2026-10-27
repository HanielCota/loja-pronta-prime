'use client';

import { useEffect, useState } from 'react';
import { getMyUnreadSupportCount } from '../server/actions';

/**
 * "N chamados com resposta nova", ao lado de "Meus chamados" no menu da conta. Lê ao abrir o menu
 * (o item só existe com o menu aberto); o número entra no nome do link.
 */
export function MyTicketsCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    getMyUnreadSupportCount()
      .then((value) => {
        if (active) setCount(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  if (!count) return null;
  return (
    <span className="ml-auto inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-semibold text-link tabular-nums forced-colors:border forced-colors:border-[CanvasText]">
      {count}
      <span className="sr-only">{count === 1 ? 'chamado com resposta nova' : 'chamados com resposta nova'}</span>
    </span>
  );
}

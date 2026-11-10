'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { collectDevice } from '../collect-device';
import { HEARTBEAT_MS } from '../presence';

/**
 * Avisa o servidor da página aberta e do aparelho: ao chegar, ao trocar de página e a cada 30s,
 * mas só com a aba à vista (aba escondida não conta como online). Não desenha nada.
 */
export function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    const report = () => {
      if (document.visibilityState !== 'visible') return;
      // Falhar aqui não pode atrapalhar a aluna: o próximo aviso tenta de novo.
      collectDevice()
        .catch(() => undefined)
        .then((device) =>
          fetch('/api/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: pathname, device }),
            // Continua mesmo se ela fechar a aba logo depois.
            keepalive: true,
          }),
        )
        .catch(() => undefined);
    };
    // O primeiro aviso espera o navegador ficar livre: não disputa com o carregamento da página.
    // O Safari antigo não tem requestIdleCallback: lá, um segundo de espera faz o mesmo papel.
    const idle = typeof window.requestIdleCallback === 'function';
    const first = idle
      ? window.requestIdleCallback(report, { timeout: 3000 })
      : globalThis.setTimeout(report, 1000);
    const timer = window.setInterval(report, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', report);
    return () => {
      if (idle) window.cancelIdleCallback(first as number);
      else globalThis.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', report);
    };
  }, [pathname]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { HEARTBEAT_MS } from '../presence';
import { reportPresence } from '../server/actions';

/**
 * Avisa o servidor da página aberta: ao chegar, ao trocar de página e a cada 30s, mas só com a
 * aba à vista (aba escondida não conta como online). Não desenha nada.
 */
export function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    const report = () => {
      if (document.visibilityState !== 'visible') return;
      // Falhar aqui não pode atrapalhar a aluna: o próximo aviso tenta de novo.
      reportPresence(pathname).catch(() => undefined);
    };
    report();
    const timer = window.setInterval(report, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', report);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', report);
    };
  }, [pathname]);

  return null;
}

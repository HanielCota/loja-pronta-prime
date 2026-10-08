'use client';

import { useEffect, useState } from 'react';
import { AdminOverview } from './admin-overview';
import { getAdminDashboard } from '../server/actions';

type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

/** A moldura fica parada; somente os dados visíveis se atualizam a cada 30s. */
export function AdminLiveOverview({ initial }: { initial: Dashboard }) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading || document.visibilityState !== 'visible') return;
      loading = true;
      try {
        const next = await getAdminDashboard();
        if (active) setData(next);
      } catch {
        // Falhar em um aviso não apaga os dados: o próximo tenta novamente.
      } finally {
        loading = false;
      }
    };
    const timer = window.setInterval(() => void load(), 30_000);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  return <AdminOverview {...data} />;
}

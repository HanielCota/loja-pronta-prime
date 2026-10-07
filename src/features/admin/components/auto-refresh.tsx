'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Relê a página de tempos em tempos, só com a aba à vista. Não desenha nada. */
export function AutoRefresh({ everyMs }: { everyMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs, router]);

  return null;
}

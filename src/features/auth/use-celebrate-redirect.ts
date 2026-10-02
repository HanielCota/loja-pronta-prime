import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { celebrateMascot } from '@/components/brand/mascot';

/** Tempo pro mascote comemorar antes de mudar de tela. */
const CELEBRATION_MS = 900;

/** Deu certo e há um destino: o mascote comemora e só então a tela muda. */
export function useCelebrateRedirect(redirectTo: string | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (!redirectTo) return;
    celebrateMascot();
    const timer = window.setTimeout(() => router.replace(redirectTo), CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [redirectTo, router]);
}

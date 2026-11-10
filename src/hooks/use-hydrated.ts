import { useSyncExternalStore } from 'react';

const noSubscribe = () => () => {};

/**
 * Falso no HTML do servidor e na primeira pintura, verdadeiro depois que a página hidrata. Serve
 * pra ligar o que só funciona com JavaScript sem o HTML do servidor deixar de bater com o do
 * navegador (sem o efeito de um `useEffect` com estado, que pinta duas vezes).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

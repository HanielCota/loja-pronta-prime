import { useEffect, useRef } from 'react';
import { readRememberedEmail, rememberEmail } from './email-storage';

export { rememberEmail };

/**
 * Preenche o campo com o email lembrado, logo depois de a tela carregar. É de uso único (sai do
 * armazenamento ao ser lido) e não sobrescreve o que já está no campo, como o preenchimento
 * automático do navegador ou o que a pessoa digitou antes de a página terminar de carregar.
 */
export function useRestoreRememberedEmail(inputId: string, restore: (email: string) => void): void {
  const restoreRef = useRef(restore);
  const inputIdRef = useRef(inputId);

  useEffect(() => {
    const email = readRememberedEmail();
    if (!email) return;
    rememberEmail('');
    const input = document.getElementById(inputIdRef.current);
    if (input instanceof HTMLInputElement && input.value) return;
    restoreRef.current(email);
  }, []);
}

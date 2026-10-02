import { useEffect, useRef } from 'react';

/**
 * Leva o email digitado entre o login e a recuperação de senha sem colocá-lo na URL
 * (URLs vão parar em logs de servidor). Fica só na aba atual do navegador.
 */
const STORAGE_KEY = 'lojaprontaprime:auth-email';

export function rememberEmail(email: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, email.trim());
  } catch {
    // Navegação privada ou armazenamento bloqueado: a aluna só digita de novo.
  }
}

function readRememberedEmail(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

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

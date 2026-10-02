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

/** Preenche o campo com o email lembrado, uma vez, logo depois de a tela carregar. */
export function useRestoreRememberedEmail(restore: (email: string) => void): void {
  const restoreRef = useRef(restore);

  useEffect(() => {
    const email = readRememberedEmail();
    if (email) restoreRef.current(email);
  }, []);
}

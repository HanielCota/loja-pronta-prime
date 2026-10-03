/**
 * Leva o email digitado entre as telas de acesso sem colocá-lo na URL (URLs vão parar em logs de
 * servidor). Fica só na aba atual do navegador. Sem React: pode ser importado de qualquer lugar
 * (os hooks ficam em remembered-email.ts).
 */
const STORAGE_KEY = 'lojaprontaprime:auth-email';

export function rememberEmail(email: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, email.trim());
  } catch {
    // Navegação privada ou armazenamento bloqueado: a aluna só digita de novo.
  }
}

export function readRememberedEmail(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

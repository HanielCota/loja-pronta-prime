type AuthPath = '/entrar' | '/recuperar-senha' | '/primeiro-acesso';

/**
 * Monta o link entre as telas de acesso mantendo o destino pós-login.
 * O email nunca vai na URL (ver remembered-email.ts).
 */
export function authHref(path: AuthPath, next?: string): string {
  return next ? `${path}?${new URLSearchParams({ next })}` : path;
}

import { isAPIError } from 'better-auth/api';

/** Nunca registre email, senha ou a mensagem crua do erro: ela pode conter dados da aluna. */
export function reportAuthError(scope: string, error: unknown): void {
  const code = isAPIError(error) ? error.body?.code : undefined;
  const kind = error instanceof Error ? error.name : typeof error;
  console.error(`[auth] ${scope} falhou: ${code ?? kind}`);
}

import { headers } from 'next/headers';
import { auth } from '@/server/auth/auth';

/**
 * Ainda está com a senha temporária? A marca nasce `true`; `null` (contas antigas, sem a
 * marca) conta como temporária, pelo lado seguro. Único lugar com essa regra.
 */
export function needsFirstPassword(user: { mustChangePassword?: boolean | null }): boolean {
  return user.mustChangePassword !== false;
}

/**
 * Sessão de quem pode estar dentro. Conta bloqueada (reembolso, cancelamento) conta como sem
 * sessão: o plugin admin só confere o bloqueio ao criar a sessão, e um bloqueio feito direto no
 * banco deixaria as sessões abertas valendo.
 */
export async function getActiveSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.banned) return null;
  return session;
}

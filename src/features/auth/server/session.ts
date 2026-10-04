import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from '@/server/auth/auth';

// A regra mora num arquivo sem dependências de servidor, pra ser testada sozinha.
export { needsFirstPassword } from '../first-password';

/** A sessão do cookie (lida uma vez por requisição, mesmo com várias guardas pedindo). */
const readSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * Sessão de quem pode estar dentro. Conta bloqueada (reembolso, cancelamento) conta como sem
 * sessão: o plugin admin só confere o bloqueio ao criar a sessão, e um bloqueio feito direto no
 * banco deixaria as sessões abertas valendo.
 */
export async function getActiveSession() {
  const session = await readSession();
  if (!session || session.user.banned) return null;
  return session;
}

/**
 * Como `getActiveSession`, mas diz por que não há sessão: `banned` quando a conta foi bloqueada
 * com a sessão ainda aberta (pra explicar o motivo no login, em vez de só pedir pra entrar).
 */
export async function getSessionState() {
  const session = await readSession();
  if (!session) return { status: 'none' } as const;
  if (session.user.banned) return { status: 'banned' } as const;
  return { status: 'active', session } as const;
}

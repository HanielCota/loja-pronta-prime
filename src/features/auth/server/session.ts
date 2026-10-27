import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from '@/server/auth/auth';
import { isVisitOver } from '@/features/support/visit-window';

// A regra mora num arquivo sem dependências de servidor, pra ser testada sozinha.
export { needsFirstPassword } from '../first-password';

function fetchSession(requestHeaders: Headers) {
  return auth.api.getSession({ headers: requestHeaders });
}

/**
 * Sessões já pedidas, por requisição. O `cache` do React só vale na renderização de páginas; em
 * Server Actions e rotas ele não guarda nada, e cada guarda (mais o `runAsStudent`) ia ao banco de
 * novo. O Next devolve o mesmo objeto de `headers()` durante toda a requisição, então ele serve de
 * chave e some junto com ela.
 */
const sessionsByRequest = new WeakMap<Headers, ReturnType<typeof fetchSession>>();

/** A sessão do cookie (lida uma vez por requisição, mesmo com várias guardas pedindo). */
const readSession = cache(async () => {
  const requestHeaders = await headers();
  const known = sessionsByRequest.get(requestHeaders);
  if (known) return known;
  const pending = fetchSession(requestHeaders);
  sessionsByRequest.set(requestHeaders, pending);
  return pending;
});

type Session = NonNullable<Awaited<ReturnType<typeof readSession>>>;

/**
 * Visita da equipe ("Entrar como aluna") que passou de 1 hora. A sessão do plugin dura uns minutos
 * a mais só pra "Voltar ao painel" funcionar: até lá, nada mais é feito na conta da aluna.
 */
function isOverVisit(session: Session): boolean {
  if (!session.session.impersonatedBy) return false;
  return isVisitOver(new Date(session.session.createdAt));
}

/**
 * Sessão de quem pode estar dentro. Conta bloqueada (reembolso, cancelamento) conta como sem
 * sessão: o plugin admin só confere o bloqueio ao criar a sessão, e um bloqueio feito direto no
 * banco deixaria as sessões abertas valendo. Visita da equipe vencida também.
 */
export async function getActiveSession() {
  const session = await readSession();
  if (!session || session.user.banned) return null;
  if (isOverVisit(session)) return null;
  return session;
}

/**
 * Como `getActiveSession`, mas diz por que não há sessão: `banned` quando a conta foi bloqueada
 * com a sessão ainda aberta (pra explicar o motivo no login, em vez de só pedir pra entrar), e
 * `visit_over` quando a visita da equipe à conta da aluna passou de 1 hora.
 */
export async function getSessionState() {
  const session = await readSession();
  if (!session) return { status: 'none' } as const;
  if (session.user.banned) return { status: 'banned' } as const;
  if (isOverVisit(session)) return { status: 'visit_over' } as const;
  return { status: 'active', session } as const;
}

export type Visit = {
  sessionId: string;
  staffId: string;
  studentId: string;
  studentName: string;
  startedAt: Date;
  over: boolean;
};

/**
 * A visita da equipe à conta da aluna ("Entrar como aluna"), vencida ou não, ou `null` na sessão
 * da própria pessoa. Lê a mesma sessão das guardas (uma ida ao banco por requisição).
 */
export async function getVisit(): Promise<Visit | null> {
  const session = await readSession();
  if (!session) return null;
  const staffId = session.session.impersonatedBy;
  if (!staffId) return null;
  const startedAt = new Date(session.session.createdAt);
  return {
    sessionId: session.session.id,
    staffId,
    studentId: session.user.id,
    // Conta sem nome (cadastro incompleto): o e-mail diz de quem é a conta na faixa.
    studentName:
      session.user.preferredName?.trim() || session.user.name.trim() || session.user.email,
    startedAt,
    over: isVisitOver(startedAt),
  };
}

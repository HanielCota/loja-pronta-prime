import { AsyncLocalStorage } from 'node:async_hooks';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { getVisit, type Visit } from '@/features/auth/server/session';
import { redirectTargetOf, VISIT_BLOCKED_PATH, visitRuleFor } from '../visit-rules';
import { VISIT_OVER_MESSAGE, VISIT_OVER_PATH } from '../visit-window';
import { recordVisitStep } from './visit-log';

/**
 * "Entrar como aluna": alguém da equipe vê a plataforma como a aluna por 1 hora (plugin admin do
 * Better Auth). Toda Server Action e rota de escrita da área da aluna passa por aqui: o que é
 * bloqueado durante a visita é recusado, o resto roda e fica registrado com o nome de quem fez.
 * Fora de visita, nada muda. As regras moram em `visit-rules.ts`.
 */

/** Pra onde a equipe volta quando a visita termina. */
export const STAFF_HOME = '/admin/chamados';

/**
 * Marca que já estamos dentro de uma ação da aluna: uma ação que chama outra (o arquivo do SLL que
 * repassa pro de progresso) é conferida e registrada uma vez só, pela de fora.
 */
const insideStudentAction = new AsyncLocalStorage<true>();

function pathOnly(target: string): string {
  return target.split(/[?#]/)[0] || target;
}

async function recordStep(
  visit: Visit,
  kind: 'action' | 'refused',
  action: string,
  path: string | null,
) {
  await recordVisitStep({
    kind,
    sessionId: visit.sessionId,
    staffId: visit.staffId,
    studentId: visit.studentId,
    action,
    path,
  });
}

/**
 * Encerra a visita e devolve a sessão de quem entrou (o `nextCookies` grava o cookie). `false`
 * quando não havia visita ou o plugin não conseguiu devolver a sessão (aí a pessoa entra de novo).
 */
export async function endVisit(): Promise<boolean> {
  const visit = await getVisit();
  if (!visit) return false;
  try {
    await auth.api.stopImpersonating({ headers: await headers() });
  } catch (error) {
    console.error('[support] não foi possível encerrar a visita.', {
      error: error instanceof Error ? error.message : 'desconhecido',
    });
    return false;
  }
  await recordVisitStep({
    kind: 'ended',
    sessionId: visit.sessionId,
    staffId: visit.staffId,
    studentId: visit.studentId,
    action: 'voltar ao painel',
  });
  return true;
}

/**
 * O ponto central das Server Actions da área da aluna. `actionName` é o nome exportado da ação
 * (um teste confere). `skipped` é o que uma ação silenciosa devolve durante a visita, sem gravar.
 *
 * Uma ação que termina em `redirect()` também conta como feita: o Next redireciona lançando um
 * erro, então ele é registrado (só o caminho, sem a consulta) e lançado de novo.
 */
export async function runAsStudent<Result>(
  actionName: string,
  run: () => Promise<Result>,
  skipped?: Result,
): Promise<Result> {
  if (insideStudentAction.getStore()) return run();
  const visit = await getVisit();
  if (!visit) return run();
  if (visit.over) redirect(VISIT_OVER_PATH);

  const rule = visitRuleFor(actionName);
  if (rule.kind === 'quiet') return skipped as Result;
  if (rule.kind === 'read') return insideStudentAction.run(true, run);
  if (rule.kind === 'ends_visit') {
    await endVisit();
    redirect(STAFF_HOME);
  }
  if (rule.kind === 'blocked') {
    await recordStep(visit, 'refused', actionName, null);
    redirect(`${VISIT_BLOCKED_PATH}?acao=${encodeURIComponent(actionName)}`);
  }

  try {
    const result = await insideStudentAction.run(true, run);
    await recordStep(visit, 'action', actionName, null);
    return result;
  } catch (error) {
    const target = redirectTargetOf(error);
    if (target !== null) await recordStep(visit, 'action', actionName, pathOnly(target));
    throw error;
  }
}

export type RouteVisit =
  | { status: 'student' }
  | { status: 'over'; message: string }
  | { status: 'refused'; message: string }
  | { status: 'quiet' }
  | { status: 'allowed'; record: (path?: string | null) => Promise<void> };

/**
 * A mesma regra pras rotas de API da área da aluna, que respondem cada uma no seu formato: quem
 * chama recusa (`over`/`refused`), não grava (`quiet`) ou age e depois chama `record`.
 */
export async function visitForRoute(actionName: string): Promise<RouteVisit> {
  const visit = await getVisit();
  if (!visit) return { status: 'student' };
  if (visit.over) return { status: 'over', message: VISIT_OVER_MESSAGE };

  const rule = visitRuleFor(actionName);
  if (rule.kind === 'blocked') {
    await recordStep(visit, 'refused', actionName, null);
    return { status: 'refused', message: rule.message };
  }
  if (rule.kind === 'quiet') return { status: 'quiet' };
  return {
    status: 'allowed',
    record: (path = null) => recordStep(visit, 'action', actionName, path),
  };
}

import { AsyncLocalStorage } from 'node:async_hooks';
import { eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { db } from '@/server/db';
import { session } from '@/server/db/schema';
import { getVisit, type Visit } from '@/features/auth/server/session';
import { redirectTargetOf, VISIT_BLOCKED_PATH, visitRuleFor } from '../visit-rules';
import { STAFF_HOME, VISIT_OVER_MESSAGE, VISIT_OVER_PATH } from '../visit-window';
import { recordVisitStep } from './visit-log';

/**
 * "Entrar como aluna": alguém da equipe vê a plataforma como a aluna por 1 hora (plugin admin do
 * Better Auth). Toda Server Action e rota de escrita da área da aluna passa por aqui: o que é
 * bloqueado durante a visita é recusado, o resto roda e fica registrado com o nome de quem fez.
 * Fora de visita, nada muda. As regras moram em `visit-rules.ts`.
 */

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
 * Quando o plugin não consegue devolver a sessão da equipe (cookie da volta perdido, sessão da
 * equipe encerrada em outro aparelho, conta apagada), a visita não pode ficar aberta: apaga a
 * sessão da visita e os cookies, e a pessoa entra de novo pelo login.
 */
async function dropVisitSession(visit: Visit): Promise<void> {
  await db.delete(session).where(eq(session.id, visit.sessionId));
  const context = await auth.$context;
  const store = await cookies();
  store.delete(context.authCookies.sessionToken.name);
  store.delete(context.createAuthCookie('admin_session').name);
}

export type VisitEnd = 'returned' | 'signed_out' | 'none';

/**
 * Encerra a visita. `returned`: a sessão de quem entrou voltou (o `nextCookies` grava o cookie).
 * `signed_out`: não deu pra devolver, então a visita foi apagada e a pessoa entra de novo.
 * `none`: não havia visita (já tinha terminado).
 */
export async function endVisit(): Promise<VisitEnd> {
  const visit = await getVisit();
  if (!visit) return 'none';
  let end: VisitEnd = 'returned';
  try {
    await auth.api.stopImpersonating({ headers: await headers() });
  } catch (error) {
    console.error('[support] não foi possível devolver a sessão da equipe.', {
      sessionId: visit.sessionId,
      error: error instanceof Error ? error.message : 'desconhecido',
    });
    await dropVisitSession(visit);
    end = 'signed_out';
  }
  await recordVisitStep({
    kind: 'ended',
    sessionId: visit.sessionId,
    staffId: visit.staffId,
    studentId: visit.studentId,
    action: end === 'returned' ? 'voltar ao painel' : 'saída sem devolver a sessão',
  });
  return end;
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
  if (!visit) return insideStudentAction.run(true, run);

  const rule = visitRuleFor(actionName);
  // "Sair" encerra a visita mesmo nos minutos depois de 1 hora.
  if (rule.kind === 'ends_visit') {
    const end = await endVisit();
    redirect(end === 'returned' ? STAFF_HOME : '/entrar');
  }
  if (visit.over) redirect(VISIT_OVER_PATH);
  if (rule.kind === 'quiet') return skipped as Result;
  if (rule.kind === 'read') return insideStudentAction.run(true, run);
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

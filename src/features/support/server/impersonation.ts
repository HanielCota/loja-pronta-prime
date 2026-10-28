import { db } from '@/server/db';
import { supportImpersonationLog } from '@/server/db/schema';
import { getSessionState } from '@/features/auth/server/session';

/**
 * "Entrar como aluna": a equipe vê a plataforma como a aluna por 1 hora (plugin admin do Better
 * Auth). Durante a visita, o que muda a conta dela ou gasta crédito dela fica bloqueado no servidor
 * (senha, e-mail, foto, nome, criação de logo, encerrar ou avaliar chamado) e o que a equipe faz
 * fica registrado.
 */

export const RETURN_COOKIE = 'support_visit_return';

/** A sessão atual é uma visita da equipe à conta de uma aluna? */
export async function isStaffVisit(): Promise<boolean> {
  const state = await getSessionState();
  return state.status === 'active' && Boolean(state.session.session.impersonatedBy);
}

export const VISIT_WRITE_REFUSED =
  'Visitando a conta da aluna, você só olha. Pra responder, use o chamado no painel do suporte.';

/**
 * Recusa uma escrita feita durante a visita e registra a tentativa. Sem isso, o que a equipe
 * escrevesse ficaria gravado como se fosse da aluna. `true`: era visita e a escrita foi recusada.
 */
export async function refuseDuringVisit(action: string, path: string | null = null): Promise<boolean> {
  if (!(await isStaffVisit())) return false;
  await logVisit(`recusado: ${action}`, path);
  return true;
}

/** Registra uma ação feita durante a visita (sem conteúdo: só o que e onde). */
export async function logVisit(action: string, path: string | null = null): Promise<void> {
  const state = await getSessionState();
  if (state.status !== 'active' || !state.session.session.impersonatedBy) return;
  await db
    .insert(supportImpersonationLog)
    .values({
      staffId: state.session.session.impersonatedBy,
      studentId: state.session.user.id,
      action,
      path,
    })
    .catch(() => console.error('[support] registro da visita falhou.'));
}

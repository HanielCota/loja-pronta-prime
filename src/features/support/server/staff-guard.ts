import { notFound, redirect } from 'next/navigation';
import { authHref } from '@/features/auth/links';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { hasStaffPermission, isStaffRole, type StaffPermission } from '../staff-access';

/**
 * Guardas da equipe de suporte. Como o `requireAdmin`: conta bloqueada sai, sem sessão vai pro
 * login, senha pendente vai criar a senha, e quem não tem a permissão recebe 404 (não "proibido":
 * a página nem existe pra quem não é da equipe).
 */
export async function requireStaff(path: string, permission: StaffPermission) {
  const state = await getSessionState();
  if (state.status === 'banned') redirect('/entrar?motivo=conta-desativada');
  if (state.status === 'none') redirect(authHref('/entrar', path));
  const { session } = state;
  if (needsFirstPassword(session.user)) redirect(authHref('/primeiro-acesso', path));
  if (!hasStaffPermission(session.user.role, permission)) notFound();
  return session;
}

export class StaffAccessError extends Error {
  constructor() {
    super('Você não tem acesso a isso.');
    this.name = 'StaffAccessError';
  }
}

/** Para Server Actions e rotas: em vez de redirecionar, devolve `null` (quem chama responde). */
export async function readStaffSession(permission: StaffPermission) {
  const state = await getSessionState();
  if (state.status !== 'active') return null;
  const { session } = state;
  if (needsFirstPassword(session.user)) return null;
  if (!hasStaffPermission(session.user.role, permission)) return null;
  return session;
}

/** A moldura do admin se desenha pra qualquer pessoa da equipe (o menu filtra por cargo). */
export async function readStaffFrameSession() {
  const state = await getSessionState();
  if (state.status !== 'active') return null;
  const { session } = state;
  if (needsFirstPassword(session.user) || !isStaffRole(session.user.role)) return null;
  return session;
}

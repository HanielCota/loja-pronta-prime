import { notFound, redirect } from 'next/navigation';
import { authHref } from '@/features/auth/links';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { hasAdminRole } from '../access';

/** Confere a permissão no servidor; páginas e futuras ações administrativas devem usar esta guarda. */
export async function requireAdmin(path = '/admin') {
  const state = await getSessionState();

  if (state.status === 'banned') redirect('/entrar?motivo=conta-desativada');
  if (state.status === 'none') redirect(authHref('/entrar', path));

  const { session } = state;
  if (needsFirstPassword(session.user)) redirect(authHref('/primeiro-acesso', path));
  if (!hasAdminRole(session.user.role)) notFound();

  return session;
}

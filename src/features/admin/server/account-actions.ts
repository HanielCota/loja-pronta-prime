'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { session, user } from '@/server/db/schema';
import { parseAccountEdit, withAdminRole } from '../account-edit';
import { hasAdminRole } from '../access';
import { requireAdmin } from './access';

export type AccountActionState = { message: string; saved: boolean };

function accountId(data: FormData) {
  const id = data.get('id');
  return typeof id === 'string' && id ? id : null;
}

function refresh(id: string) {
  revalidatePath('/admin/contas');
  revalidatePath(`/admin/contas/${id}`);
}

/** Salva nome, email, função e a troca obrigatória de senha. */
export async function saveAccount(
  _previous: AccountActionState,
  data: FormData,
): Promise<AccountActionState> {
  const id = accountId(data);
  const admin = await requireAdmin(id ? `/admin/contas/${id}` : '/admin/contas');
  const edit = parseAccountEdit(data);
  if (!id || !edit) {
    return {
      message: 'Confira os campos: nome com 2 letras ou mais e um email válido.',
      saved: false,
    };
  }

  const target = await db.query.user.findFirst({
    columns: { id: true, role: true },
    where: eq(user.id, id),
  });
  if (!target) return { message: 'Essa conta não existe mais.', saved: false };
  // Sem isso, a admin poderia se trancar fora do painel sem querer.
  if (target.id === admin.user.id && !edit.admin && hasAdminRole(target.role)) {
    return { message: 'Você não pode tirar a sua própria função de admin.', saved: false };
  }

  const taken = await db.query.user.findFirst({
    columns: { id: true },
    where: and(eq(user.email, edit.email), ne(user.id, id)),
  });
  if (taken) return { message: 'Esse email já é de outra conta.', saved: false };

  await db
    .update(user)
    .set({
      name: edit.name,
      preferredName: edit.preferredName,
      email: edit.email,
      role: withAdminRole(target.role, edit.admin),
      mustChangePassword: edit.mustChangePassword,
    })
    .where(eq(user.id, id));
  refresh(id);
  return { message: 'Alterações salvas.', saved: true };
}

/** Bloqueia (encerrando as sessões abertas) ou desbloqueia a conta. */
export async function setAccountBlocked(
  _previous: AccountActionState,
  data: FormData,
): Promise<AccountActionState> {
  const id = accountId(data);
  const admin = await requireAdmin(id ? `/admin/contas/${id}` : '/admin/contas');
  const block = data.get('blocked') === 'yes';
  const reasonValue = data.get('reason');
  const reason = typeof reasonValue === 'string' ? reasonValue.trim() : '';
  if (!id) return { message: 'Conta não encontrada.', saved: false };
  if (id === admin.user.id) return { message: 'Você não pode bloquear a sua conta.', saved: false };
  if (block && (reason.length < 3 || reason.length > 500)) {
    return { message: 'Escreva o motivo do bloqueio (3 a 500 caracteres).', saved: false };
  }

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(user)
      .set({ banned: block, banReason: block ? reason : null, banExpires: null })
      .where(eq(user.id, id))
      .returning({ id: user.id });
    if (block) await tx.delete(session).where(eq(session.userId, id));
    return rows.length > 0;
  });
  if (!updated) return { message: 'Essa conta não existe mais.', saved: false };
  refresh(id);
  return {
    message: block ? 'Conta bloqueada e sessões encerradas.' : 'Conta desbloqueada.',
    saved: true,
  };
}

/** Desconecta a conta de todos os aparelhos; ela entra de novo com a senha. */
export async function endAccountSessions(
  _previous: AccountActionState,
  data: FormData,
): Promise<AccountActionState> {
  const id = accountId(data);
  const admin = await requireAdmin(id ? `/admin/contas/${id}` : '/admin/contas');
  if (!id) return { message: 'Conta não encontrada.', saved: false };
  if (id === admin.user.id) {
    return { message: 'Para sair da sua conta, use "Sair" no menu da conta.', saved: false };
  }
  const removed = await db.delete(session).where(eq(session.userId, id)).returning();
  refresh(id);
  return {
    message: removed.length
      ? 'Sessões encerradas. A pessoa vai precisar entrar de novo.'
      : 'Essa conta não tinha nenhuma sessão aberta.',
    saved: removed.length > 0,
  };
}

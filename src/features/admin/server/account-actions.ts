'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { revalidateAdminOverview } from './overview-cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { reportAuthError } from '@/server/auth/report-error';
import { db } from '@/server/db';
import { resetStudentToInitialPassword } from '@/server/auth/reset-student-password';
import { DEFAULT_STUDENT_PASSWORD } from '@/server/auth/student-password';
import {
  manualProductGrants,
  productAccessEvents,
  session,
  studentProducts,
  user,
} from '@/server/db/schema';
import { parseAccountEdit, withAdminRole } from '../account-edit';
import { parseNewAccount, type NewAccountErrors } from '../new-account';
import { hasAdminRole } from '../access';
import { requireAdmin } from './access';

export type AccountActionState = { message: string; saved: boolean };

export type NewAccountState = {
  /** Cresce a cada resposta: o formulário recomeça com o que foi digitado. */
  attempt: number;
  errors?: NewAccountErrors;
  values?: { name: string; email: string; role: string; access: string; products: string[] };
};

/**
 * Cria uma conta pelo painel: aluna ou admin, com os produtos escolhidos (liberação manual, com
 * histórico) e o primeiro acesso por email (o link de criar senha) ou por senha temporária (que
 * ela troca ao entrar). Depois, abre a tela da conta nova.
 */
export async function createAccount(
  previous: NewAccountState,
  data: FormData,
): Promise<NewAccountState> {
  const admin = await requireAdmin('/admin/contas/nova');
  const parsed = parseNewAccount(data);
  const values = {
    name: String(data.get('name') ?? ''),
    email: String(data.get('email') ?? ''),
    role: String(data.get('role') ?? 'student'),
    access: String(data.get('access') ?? 'email'),
    products: data.getAll('products').map(String),
  };
  const fail = (errors: NewAccountErrors): NewAccountState => ({
    attempt: previous.attempt + 1,
    errors,
    values,
  });
  if (!parsed.ok) return fail(parsed.errors);
  const account = parsed.account;

  const existing = await db.query.user.findFirst({
    columns: { id: true },
    where: eq(user.email, account.email),
  });
  if (existing) return fail({ email: 'Já existe uma conta com esse email.' });

  let userId: string;
  try {
    const created = await auth.api.createUser({
      body: {
        email: account.email,
        name: account.name,
        // Por email, ela cria a senha pelo link: a senha inicial é aleatória e ninguém a conhece.
        password: account.password ?? randomBytes(48).toString('base64url'),
        role: account.admin ? 'admin' : 'user',
        // Quem criou é a admin: o email não precisa de outra confirmação. Com senha temporária,
        // ela troca no primeiro acesso; pelo link do email, a senha já é dela.
        data: { emailVerified: true, mustChangePassword: account.access === 'password' },
      },
    });
    userId = created.user.id;
  } catch (error) {
    // Outra admin pode ter criado o mesmo email no mesmo instante.
    const concurrent = await db.query.user.findFirst({
      columns: { id: true },
      where: eq(user.email, account.email),
    });
    if (concurrent) return fail({ email: 'Já existe uma conta com esse email.' });
    reportAuthError('criação de conta pelo painel', error);
    return fail({ form: 'Não foi possível criar a conta agora. Tente de novo.' });
  }

  if (account.products.length) {
    await db.transaction(async (tx) => {
      for (const product of account.products) {
        await tx.insert(studentProducts).values({ userId, product }).onConflictDoNothing();
        // Manual: um reembolso da Hotmart depois não tira o que a admin liberou.
        await tx.insert(manualProductGrants).values({ userId, product }).onConflictDoNothing();
        await tx.insert(productAccessEvents).values({
          id: randomUUID(),
          targetUserId: userId,
          actorUserId: admin.user.id,
          product,
          action: 'granted',
          reason: 'Conta criada no painel',
        });
      }
    });
  }

  let emailSent = true;
  if (account.access === 'email') {
    try {
      await auth.api.requestPasswordReset({
        body: { email: account.email, redirectTo: '/redefinir-senha' },
        headers: await headers(),
      });
    } catch (error) {
      emailSent = false;
      reportAuthError('convite da conta criada no painel', error);
    }
  }

  revalidateAdminOverview();
  revalidatePath('/admin/contas');
  revalidatePath('/admin');
  redirect(
    `/admin/contas/${userId}?criada=${account.access === 'password' ? 'senha' : emailSent ? 'email' : 'sem-email'}`,
  );
}

function accountId(data: FormData) {
  const id = data.get('id');
  return typeof id === 'string' && id ? id : null;
}

function refresh(id: string) {
  revalidateAdminOverview();
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
  const blockedValue = data.get('blocked');
  // Campo ausente não pode virar "desbloquear": só 'yes' e 'no' são pedidos de verdade.
  if (blockedValue !== 'yes' && blockedValue !== 'no')
    return { message: 'Atualize a página e tente de novo.', saved: false };
  const block = blockedValue === 'yes';
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

/** Volta a senha da aluna para a senha inicial, para quem não consegue entrar. */
export async function resetStudentPassword(
  _previous: AccountActionState,
  data: FormData,
): Promise<AccountActionState> {
  const id = accountId(data);
  await requireAdmin(id ? `/admin/contas/${id}` : '/admin/contas');
  if (!id) return { message: 'Conta não encontrada.', saved: false };

  const result = await resetStudentToInitialPassword(id);
  if (result === 'missing') return { message: 'Essa conta não existe mais.', saved: false };
  if (result === 'not_student') {
    return { message: 'Só contas de aluna podem voltar para a senha inicial.', saved: false };
  }
  refresh(id);
  return {
    message: `Pronto. Ela já pode entrar com o email dela e a senha ${DEFAULT_STUDENT_PASSWORD}.`,
    saved: true,
  };
}

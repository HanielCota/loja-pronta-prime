import { and, eq, gt, ne } from 'drizzle-orm';
import { auth } from '@/server/auth/auth';
import { db } from '@/server/db';
import { account, session, user } from '@/server/db/schema';
import type { AuthErrorCode } from '../error-codes';

/** A senha e a saída dos outros aparelhos são confirmadas juntas, preservando a sessão atual. */
export async function changeOwnPassword(
  userId: string,
  keepToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthErrorCode | null> {
  const context = await auth.$context;
  const [credential] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
  if (
    !credential?.password ||
    !(await context.password.verify({ hash: credential.password, password: currentPassword }))
  )
    return 'wrong_current_password';
  // O cálculo fica fora da transação para não segurar as travas enquanto gera o hash.
  const password = await context.password.hash(newPassword);
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ banned: user.banned, mustChangePassword: user.mustChangePassword })
      .from(user)
      .where(eq(user.id, userId))
      .for('update');
    if (!owner || owner.banned || owner.mustChangePassword) return 'session_expired';
    const [active] = await tx
      .select({ id: session.id })
      .from(session)
      .where(
        and(
          eq(session.userId, userId),
          eq(session.token, keepToken),
          gt(session.expiresAt, new Date()),
        ),
      )
      .for('update');
    if (!active) return 'session_expired';
    // Outra troca ou redefinição durante o cálculo exige conferir a senha novamente.
    const [changed] = await tx
      .update(account)
      .set({ password, updatedAt: new Date() })
      .where(
        and(
          eq(account.id, credential.id),
          eq(account.userId, userId),
          eq(account.password, credential.password!),
        ),
      )
      .returning({ id: account.id });
    if (!changed) return 'wrong_current_password';
    await tx.delete(session).where(and(eq(session.userId, userId), ne(session.token, keepToken)));
    return null;
  });
}

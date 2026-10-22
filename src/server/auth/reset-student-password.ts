import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { db } from '@/server/db';
import { account, session, user, verification } from '@/server/db/schema';
import { DEFAULT_STUDENT_PASSWORD } from './student-password';

export type ResetStudentPasswordResult = 'reset' | 'missing' | 'not_student';

/**
 * Volta a senha de uma aluna para a senha inicial, numa transação só. Contas de admin ou com
 * outra função ficam de fora: uma senha que todas conhecem não pode abrir o painel.
 * Encerra as sessões e os links de troca de senha abertos, como o comando de manutenção.
 */
export async function resetStudentToInitialPassword(
  userId: string,
): Promise<ResetStudentPasswordResult> {
  const password = await hashPassword(DEFAULT_STUDENT_PASSWORD);
  return db.transaction(async (tx) => {
    // Trava a conta: uma troca de função ao mesmo tempo não escapa da conferência abaixo.
    const [target] = await tx
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .for('update');
    if (!target) return 'missing';
    if ((target.role ?? 'user') !== 'user') return 'not_student';

    const updated = await tx
      .update(account)
      .set({ password, updatedAt: new Date() })
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
      .returning({ id: account.id });
    // Conta sem acesso por senha (criada por outro caminho): cria esse acesso.
    if (!updated.length) {
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password,
        updatedAt: new Date(),
      });
    }
    await tx
      .update(user)
      .set({ mustChangePassword: false, emailVerified: true })
      .where(eq(user.id, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx
      .delete(verification)
      .where(
        and(eq(verification.value, userId), like(verification.identifier, 'reset-password:%')),
      );
    return 'reset';
  });
}

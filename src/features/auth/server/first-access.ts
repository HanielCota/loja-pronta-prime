'use server';

import { parseWithZod } from '@conform-to/zod/v4';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { reportAuthError } from '@/server/auth/report-error';
import { db } from '@/server/db';
import { account, user } from '@/server/db/schema';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { firstPasswordSchema } from '../schemas';
import { resolvePostLoginPath } from './post-login';
import { getActiveSession, needsFirstPassword } from './session';
import { HIDDEN_FIELDS, reject, type FormResult } from './submission';

export type FirstAccessResult = { submission?: FormResult; redirectTo?: string } | undefined;

/**
 * Primeiro acesso: a aluna (já logada com a senha temporária) cria a própria senha.
 * Não pede a senha atual: ela acabou de digitá-la no login, e a sessão prova isso.
 *
 * Só vale enquanto a conta ainda está com a senha temporária. Uma Server Action pode ser chamada
 * direto (não só pela página), então a regra fica aqui: sem ela, qualquer sessão aberta trocaria
 * a senha sem saber a atual.
 */
export async function createFirstPassword(
  _state: FirstAccessResult,
  formData: FormData,
): Promise<FirstAccessResult> {
  const submission = parseWithZod(formData, { schema: firstPasswordSchema });
  if (submission.status !== 'success') {
    return { submission: submission.reply({ hideFields: HIDDEN_FIELDS }) };
  }

  const { password, next } = submission.value;
  const destination = resolvePostLoginPath(next);
  // Com JavaScript: a tela comemora e depois navega. Sem: redireciona direto.
  const finish = (): FirstAccessResult => {
    if (formData.get(ENHANCED_SUBMIT_FIELD)) return { redirectTo: destination };
    redirect(destination);
  };

  let session: Awaited<ReturnType<typeof getActiveSession>>;
  try {
    session = await getActiveSession();
  } catch (error) {
    reportAuthError('leitura da sessão no primeiro acesso', error);
    return { submission: reject(submission, 'unknown') };
  }
  if (!session) return { submission: reject(submission, 'session_expired') };
  // Já criou a senha (ou outra aba acabou de criar): não há nada a trocar aqui.
  if (!needsFirstPassword(session.user)) return finish();

  const userId = session.user.id;
  if (!(await consumeAttempt('firstPasswordPerUser', userId))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  let outcome: 'changed' | 'already-done' | 'same-password';
  try {
    const context = await auth.$context;
    const newHash = await context.password.hash(password);
    // Tudo numa transação, com a linha da aluna travada: dois envios ao mesmo tempo (clique
    // duplo, outra aba) não se atropelam, e senha e marca mudam juntas ou nenhuma muda.
    outcome = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ mustChangePassword: user.mustChangePassword })
        .from(user)
        .where(eq(user.id, userId))
        .for('update');
      if (!current || !needsFirstPassword(current)) return 'already-done';

      const credential = and(eq(account.userId, userId), eq(account.providerId, 'credential'));
      const [stored] = await tx
        .select({ password: account.password })
        .from(account)
        .where(credential);
      if (
        stored?.password &&
        (await context.password.verify({ hash: stored.password, password }))
      ) {
        return 'same-password';
      }

      const now = new Date();
      await tx.update(account).set({ password: newHash, updatedAt: now }).where(credential);
      await tx
        .update(user)
        .set({ mustChangePassword: false, updatedAt: now })
        .where(eq(user.id, userId));
      return 'changed';
    });

    if (outcome === 'changed') {
      // Quem souber a senha temporária (ela foi por email) perde as outras sessões; esta continua.
      const others = (await context.internalAdapter.listSessions(userId))
        .map((item) => item.token)
        .filter((token) => token !== session.session.token);
      if (others.length) await context.internalAdapter.deleteSessions(others);
    }
  } catch (error) {
    reportAuthError('criação da senha no primeiro acesso', error);
    return { submission: reject(submission, 'unknown') };
  }

  if (outcome === 'same-password') return { submission: reject(submission, 'same_password') };
  return finish();
}

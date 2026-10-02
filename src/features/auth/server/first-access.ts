'use server';

import { parseWithZod } from '@conform-to/zod/v4';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { reportAuthError } from '@/server/auth/report-error';
import { ENHANCED_SUBMIT_FIELD } from '../enhanced-submit';
import { firstPasswordSchema } from '../schemas';
import { resolvePostLoginPath } from './post-login';
import { HIDDEN_FIELDS, reject, type FormResult } from './submission';

export type FirstAccessResult = { submission?: FormResult; redirectTo?: string } | undefined;

/**
 * Primeiro acesso: a aluna (já logada com a senha temporária) cria a própria senha.
 * Não pede a senha atual: ela acabou de digitá-la no login, e a sessão prova isso.
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { submission: reject(submission, 'session_expired') };

  const userId = session.user.id;
  if (!(await consumeAttempt('firstPasswordPerUser', userId))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  try {
    const context = await auth.$context;
    const credential = (await context.internalAdapter.findAccounts(userId)).find(
      (account) => account.providerId === 'credential',
    );
    if (
      credential?.password &&
      (await context.password.verify({ hash: credential.password, password }))
    ) {
      return { submission: reject(submission, 'same_password') };
    }

    await context.internalAdapter.updatePassword(userId, await context.password.hash(password));
    await context.internalAdapter.updateUser(userId, { mustChangePassword: false });

    // Quem souber a senha temporária (ela foi por email) perde as outras sessões; esta continua.
    const others = (await context.internalAdapter.listSessions(userId))
      .map((item) => item.token)
      .filter((token) => token !== session.session.token);
    if (others.length) await context.internalAdapter.deleteSessions(others);
  } catch (error) {
    reportAuthError('criação da senha no primeiro acesso', error);
    return { submission: reject(submission, 'unknown') };
  }

  const destination = resolvePostLoginPath(next);
  // Com JavaScript: a tela comemora e depois navega. Sem: redireciona direto.
  if (formData.get(ENHANCED_SUBMIT_FIELD)) return { redirectTo: destination };
  redirect(destination);
}

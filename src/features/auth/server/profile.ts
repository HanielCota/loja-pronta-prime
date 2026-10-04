'use server';

import { parseWithZod } from '@conform-to/zod/v4';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/server/auth/auth';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { reportAuthError } from '@/server/auth/report-error';
import { revokeOtherSessions } from '@/server/auth/sessions';
import { db } from '@/server/db';
import { user } from '@/server/db/schema';
import { changePasswordSchema, profileNameSchema } from '../schemas';
import { toAuthErrorCode } from './better-auth-errors';
import { getActiveSession, needsFirstPassword } from './session';
import { HIDDEN_FIELDS, reject, type FormResult } from './submission';

export type ProfileResult = { submission?: FormResult; saved?: boolean } | undefined;

/**
 * Sessão de quem pode mexer no perfil. Uma Server Action pode ser chamada direto (não só pela
 * página), então a regra da página vale aqui também: quem ainda está com a senha temporária cria
 * a própria senha antes, no primeiro acesso.
 */
async function profileSession() {
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user)) return null;
  return session;
}

/**
 * Como ela quer ser chamada, nas saudações. Fica à parte do nome completo da compra, que não muda.
 */
export async function updateName(
  _state: ProfileResult,
  formData: FormData,
): Promise<ProfileResult> {
  const submission = parseWithZod(formData, { schema: profileNameSchema });
  if (submission.status !== 'success') return { submission: submission.reply() };

  let session: Awaited<ReturnType<typeof profileSession>>;
  try {
    session = await profileSession();
  } catch (error) {
    reportAuthError('leitura da sessão no perfil', error);
    return { submission: reject(submission, 'unknown') };
  }
  if (!session) return { submission: reject(submission, 'session_expired') };

  const userId = session.user.id;
  if (!(await consumeAttempt('profileNamePerUser', userId))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  try {
    await db
      .update(user)
      .set({ preferredName: submission.value.name, updatedAt: new Date() })
      .where(eq(user.id, userId));
  } catch (error) {
    reportAuthError('troca do nome no perfil', error);
    return { submission: reject(submission, 'unknown') };
  }

  // O nome aparece na saudação das telas de dentro.
  revalidatePath('/', 'layout');
  return { submission: submission.reply(), saved: true };
}

/**
 * Trocar a senha pedindo a atual. As outras sessões (outro celular, um computador emprestado)
 * terminam; esta continua a mesma. (O `revokeOtherSessions` do Better Auth troca também esta, e o
 * cookie novo faz a página recarregar e perder o aviso de "Senha trocada".)
 */
export async function changePassword(
  _state: ProfileResult,
  formData: FormData,
): Promise<ProfileResult> {
  const submission = parseWithZod(formData, { schema: changePasswordSchema });
  if (submission.status !== 'success') {
    return { submission: submission.reply({ hideFields: HIDDEN_FIELDS }) };
  }

  let session: Awaited<ReturnType<typeof profileSession>>;
  try {
    session = await profileSession();
  } catch (error) {
    reportAuthError('leitura da sessão no perfil', error);
    return { submission: reject(submission, 'unknown') };
  }
  if (!session) return { submission: reject(submission, 'session_expired') };

  if (!(await consumeAttempt('changePasswordPerUser', session.user.id))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  const { currentPassword, password } = submission.value;
  if (currentPassword === password) return { submission: reject(submission, 'unchanged_password') };

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword: password },
      headers: await headers(),
    });
  } catch (error) {
    const code = toAuthErrorCode(error);
    if (code === 'unknown') reportAuthError('troca de senha no perfil', error);
    return { submission: reject(submission, code) };
  }
  // A senha já mudou: encerrar os outros aparelhos não pode virar um "deu errado" na tela.
  await revokeOtherSessions(session.user.id, session.session.token);

  // Sem os valores de volta: os campos de senha ficam vazios depois de salvar.
  return { submission: submission.reply({ resetForm: true }), saved: true };
}

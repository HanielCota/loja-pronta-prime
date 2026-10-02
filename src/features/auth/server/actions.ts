'use server';

import { parseWithZod } from '@conform-to/zod/v4';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { reportAuthError } from '@/server/auth/report-error';
import { getClientIp } from '@/server/request/client-ip';
import { ENHANCED_SUBMIT_FIELD } from '../enhanced-submit';
import { loginSchema, recoverSchema, resetPasswordSchema } from '../schemas';
import { toAuthErrorCode } from './better-auth-errors';
import { resolvePostLoginPath } from './post-login';
import { needsFirstPassword } from './session';
import { HIDDEN_FIELDS, reject, type FormResult } from './submission';

export type LoginResult = { submission?: FormResult; redirectTo?: string } | undefined;
export type RecoverResult = { submission?: FormResult; sentTo?: string } | undefined;
export type ResetResult = { submission?: FormResult; completed?: boolean } | undefined;

/** Login: limite por conta (email) e, quando o IP é conhecido, por IP. */
async function canAttemptLogin(email: string): Promise<boolean> {
  const ip = await getClientIp();
  const byEmail = await consumeAttempt('loginPerEmail', email);
  const byIp = ip ? await consumeAttempt('loginPerIp', ip) : true;
  return byEmail && byIp;
}

export async function login(_state: LoginResult, formData: FormData): Promise<LoginResult> {
  const submission = parseWithZod(formData, { schema: loginSchema });
  if (submission.status !== 'success') {
    return { submission: submission.reply({ hideFields: HIDDEN_FIELDS }) };
  }

  const { email, password, next } = submission.value;

  if (!(await canAttemptLogin(email))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  let mustChangePassword: boolean;
  try {
    const { user } = await auth.api.signInEmail({
      // callbackURL: pra onde volta o link de confirmação de email, se ele for enviado.
      body: { email, password, callbackURL: '/entrar' },
      headers: await headers(),
    });
    // Conta com senha temporária (ou sem a marca): primeiro cria a própria senha.
    mustChangePassword = needsFirstPassword(user);
  } catch (error) {
    const code = toAuthErrorCode(error);
    if (code === 'unknown') reportAuthError('login', error);
    return { submission: reject(submission, code) };
  }

  const destination = resolvePostLoginPath(next, { mustChangePassword });
  // Com JavaScript: a tela comemora e depois navega. Sem: redireciona direto.
  if (formData.get(ENHANCED_SUBMIT_FIELD)) return { redirectTo: destination };
  redirect(destination);
}

export async function requestPasswordReset(
  _state: RecoverResult,
  formData: FormData,
): Promise<RecoverResult> {
  const submission = parseWithZod(formData, { schema: recoverSchema });
  if (submission.status !== 'success') return { submission: submission.reply() };

  const { email } = submission.value;

  // Por email: ninguém consegue encher a caixa de entrada de outra pessoa com links.
  if (!(await consumeAttempt('recoverPerEmail', email))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: '/redefinir-senha' },
      headers: await headers(),
    });
  } catch (error) {
    // A resposta continua igual: um erro aqui não pode revelar se o email tem conta.
    reportAuthError('recuperação de senha', error);
  }

  return { sentTo: email };
}

export async function resetPassword(_state: ResetResult, formData: FormData): Promise<ResetResult> {
  const submission = parseWithZod(formData, { schema: resetPasswordSchema });
  if (submission.status !== 'success') {
    return { submission: submission.reply({ hideFields: HIDDEN_FIELDS }) };
  }

  const { password, token } = submission.value;

  // Por IP, não por token: quem tenta adivinhar tokens troca de token a cada tentativa.
  const ip = await getClientIp();
  if (ip && !(await consumeAttempt('resetPerIp', ip))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword: password, token },
      headers: await headers(),
    });
  } catch (error) {
    const code = toAuthErrorCode(error);
    if (code === 'unknown') reportAuthError('redefinição de senha', error);
    return { submission: reject(submission, code) };
  }

  return { completed: true };
}

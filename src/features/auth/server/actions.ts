'use server';

import { parseWithZod } from '@conform-to/zod/v4';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { auth } from '@/server/auth/auth';
import { consumeAttempt, consumeAttempts } from '@/server/auth/rate-limit';
import { reportAuthError } from '@/server/auth/report-error';
import { getClientIp } from '@/server/request/client-ip';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { sanitizeRedirect } from '../redirect';
import { EMAIL_CONFIRMED_REASON } from '../login-reason';
import { loginSchema, recoverSchema, resetPasswordSchema } from '../schemas';
import { toAuthErrorCode } from './better-auth-errors';
import { resolvePostLoginPath } from './post-login';
import { needsFirstPassword } from './session';
import { HIDDEN_FIELDS, reject, type FormResult } from './submission';

export type LoginResult = { submission?: FormResult; redirectTo?: string } | undefined;
export type RecoverResult = { submission?: FormResult; sentTo?: string } | undefined;
export type ResetResult = { submission?: FormResult; completed?: boolean } | undefined;

/**
 * Login: limite por conta vinda de um mesmo IP, por IP (quando conhecido) e teto por conta, nessa
 * ordem. Sem IP conhecido, o limite apertado vale pra conta inteira (o lado seguro).
 */
async function canAttemptLogin(email: string): Promise<boolean> {
  const ip = await getClientIp();
  const exceeded = await consumeAttempts([
    ['loginPerEmailAndIp', ip ? `${email} ${ip}` : email],
    ['loginPerIp', ip],
    ['loginPerEmail', email],
  ]);
  return exceeded === undefined;
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
      // callbackURL: pra onde volta o link de confirmação de email, se ele for enviado. O login
      // avisa que deu certo (ou que o link venceu) e mantém o destino que ela queria.
      body: {
        email,
        password,
        callbackURL: `/entrar?${new URLSearchParams({ motivo: EMAIL_CONFIRMED_REASON, ...(next ? { next } : {}) })}`,
      },
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
  const next = sanitizeRedirect(submission.value.next);
  // O link do email traz o destino de volta: depois de criar a senha, ela entra e segue pra ele.
  const redirectTo = next
    ? `/redefinir-senha?${new URLSearchParams({ next })}`
    : '/redefinir-senha';

  // Por IP: ninguém dispara links pra uma lista inteira de emails. Por email (no minuto e no dia):
  // ninguém enche a caixa de entrada de outra pessoa com links. Nessa ordem: pedido barrado no IP
  // não gasta o limite do dia da dona do email.
  const ip = await getClientIp();
  const exceeded = await consumeAttempts([
    ['recoverPerIp', ip],
    ['recoverPerEmail', email],
    ['recoverPerEmailPerDay', email],
  ]);
  if (exceeded === 'recoverPerEmailPerDay') {
    return { submission: reject(submission, 'recover_daily_limit') };
  }
  if (exceeded) return { submission: reject(submission, 'rate_limited') };

  // Depois da resposta: com conta, o Better Auth grava o token no banco; sem conta, só consulta.
  // Respondendo antes, o tempo de resposta é o mesmo nos dois casos e não revela se o email existe.
  const requestHeaders = await headers();
  after(async () => {
    try {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo },
        headers: requestHeaders,
      });
    } catch (error) {
      reportAuthError('recuperação de senha', error);
    }
  });

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

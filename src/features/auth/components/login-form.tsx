'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getAuthErrorCode, type AuthErrorCode } from '../error-codes';
import { authHref } from '../links';
import { rememberEmail, useRestoreRememberedEmail } from '../remembered-email';
import { loginSchema } from '../schemas';
import { login } from '../server/actions';
import { useAuthForm } from '../use-auth-form';
import { useCelebrateRedirect } from '../use-celebrate-redirect';
import { AuthErrorAlert } from './auth-error-alert';
import { EmailField } from './email-field';
import { PasswordField } from './password-field';

type LoginFormProps = {
  next?: string | undefined;
  /** Motivo vindo de outra tela (ex.: sessão expirada), mostrado até o primeiro envio. */
  initialError?: AuthErrorCode | undefined;
};

export function LoginForm({ next, initialError }: LoginFormProps) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(loginSchema, login);
  const redirectTo = state?.redirectTo;
  // Login certo: o mascote comemora e só então a tela muda.
  useCelebrateRedirect(redirectTo);

  useRestoreRememberedEmail(fields.email.id);

  const errorCode = state ? getAuthErrorCode(form.errors) : initialError;

  return (
    <form {...formProps} className="flex flex-col gap-5">
      {errorCode ? (
        <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} speech>
          {errorCode === 'invalid_credentials' ? (
            <Button asChild variant="soft">
              <Link
                href={authHref('/recuperar-senha', next)}
                onClick={() => rememberEmail(fields.email.value ?? '')}
              >
                Redefinir minha senha
              </Link>
            </Button>
          ) : null}
        </AuthErrorAlert>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <EmailField
        autoComplete="username"
        meta={fields.email}
        onSuggestionAccept={(email) => form.update({ name: fields.email.name, value: email })}
      />

      <PasswordField
        meta={fields.password}
        label="Senha"
        autoComplete="current-password"
        hint="First access? Use the password provided with your access. You do not need to create another one."
        below={
          <div className="-my-1 flex justify-end">
            <Button asChild variant="link" size="inline" className="text-sm">
              <Link
                href={authHref('/recuperar-senha', next)}
                onClick={() => rememberEmail(fields.email.value ?? '')}
              >
                Forgot your password?
              </Link>
            </Button>
          </div>
        }
      />

      <Button type="submit" loading={pending || Boolean(redirectTo)} loadingText="Entrando…">
        Entrar
      </Button>
    </form>
  );
}

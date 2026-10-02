'use client';

import { CircleCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { CardHeading } from '@/components/brand/card-heading';
import { celebrateMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { getAuthErrorCode } from '../error-codes';
import { resetPasswordSchema } from '../schemas';
import { resetPassword } from '../server/actions';
import { useAuthForm } from '../use-auth-form';
import { AuthErrorAlert } from './auth-error-alert';
import { AuthStatus } from './auth-status';
import { PasswordField } from './password-field';

export function ResetPasswordForm({ token }: { token: string }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    resetPasswordSchema,
    resetPassword,
  );

  if (state?.completed) return <PasswordChanged />;

  const errorCode = getAuthErrorCode(form.errors);

  return (
    <>
      <CardHeading
        title="Crie sua senha"
        description={`Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres. Dica: uma frase curta, tipo “minha loja vai bombar”, é fácil de lembrar e difícil de adivinhar.`}
      />
      <form {...formProps} className="flex flex-col gap-5">
        {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
        {errorCode === 'reset_link_invalid' ? <RequestNewLink /> : null}
        <input type="hidden" name="token" value={token} />

        <PasswordField meta={fields.password} label="Senha nova" autoComplete="new-password" />

        <Button type="submit" loading={pending} loadingText="Salvando…">
          Salvar senha
        </Button>
      </form>
    </>
  );
}

export function InvalidResetLink() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Link de redefinição de senha</h1>
      <AuthErrorAlert code="reset_link_invalid" />
      <RequestNewLink />
    </div>
  );
}

function RequestNewLink() {
  return (
    <Button asChild>
      <Link href="/recuperar-senha">Pedir um link novo</Link>
    </Button>
  );
}

function PasswordChanged() {
  useEffect(() => celebrateMascot(), []);

  return (
    <>
      <AuthStatus icon={<CircleCheckIcon aria-hidden="true" />} title="Senha criada!">
        Agora é só entrar com o email da compra e a senha que você acabou de criar.
      </AuthStatus>
      <Button asChild>
        <Link href="/entrar">Entrar agora</Link>
      </Button>
    </>
  );
}

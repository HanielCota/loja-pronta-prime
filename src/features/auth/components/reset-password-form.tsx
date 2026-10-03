'use client';

import { CircleCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { CardHeading } from '@/components/brand/card-heading';
import { celebrateMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { getAuthErrorCode } from '../error-codes';
import { authHref } from '../links';
import { resetPasswordSchema } from '../schemas';
import { resetPassword } from '../server/actions';
import { useAuthForm } from '../use-auth-form';
import { AuthErrorAlert } from './auth-error-alert';
import { AuthStatus } from './auth-status';
import { PasswordField } from './password-field';
import { PasswordStrengthMeter } from './password-strength-meter';

export function ResetPasswordForm({ token, next }: { token: string; next?: string }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    resetPasswordSchema,
    resetPassword,
  );

  if (state?.completed) return <PasswordChanged next={next} />;

  const errorCode = getAuthErrorCode(form.errors);

  return (
    <>
      <CardHeading
        title="Crie sua senha"
        description={`Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres. Uma frase curta, como “minha loja vai bombar”, é fácil de lembrar e difícil de adivinhar.`}
      />
      <form {...formProps} className="flex flex-col gap-5">
        {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
        {errorCode === 'reset_link_invalid' ? <RequestNewLink next={next} /> : null}
        <input type="hidden" name="token" value={token} />

        <PasswordField
          meta={fields.password}
          label="Senha nova"
          autoComplete="new-password"
          meter={
            <PasswordStrengthMeter
              password={fields.password.value ?? ''}
              showTip={!fields.password.errors?.length}
            />
          }
        />

        <Button type="submit" loading={pending} loadingText="Salvando…">
          Salvar senha
        </Button>
      </form>
    </>
  );
}

export function InvalidResetLink({ next }: { next?: string }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Link de redefinição de senha</h1>
      <AuthErrorAlert code="reset_link_invalid" />
      <RequestNewLink next={next} />
    </div>
  );
}

function RequestNewLink({ next }: { next?: string }) {
  return (
    <Button asChild>
      <Link href={authHref('/recuperar-senha', next)}>Pedir um link novo</Link>
    </Button>
  );
}

function PasswordChanged({ next }: { next?: string }) {
  useEffect(() => celebrateMascot(), []);

  return (
    <>
      <AuthStatus icon={<CircleCheckIcon aria-hidden="true" />} title="Senha criada!">
        Entre com o email da compra e a senha que você acabou de criar.
      </AuthStatus>
      <Button asChild>
        <Link href={authHref('/entrar', next)}>Entrar agora</Link>
      </Button>
    </>
  );
}

'use client';

import { CardHeading } from '@/components/brand/card-heading';
import { Button } from '@/components/ui/button';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { getAuthErrorCode } from '../error-codes';
import { firstPasswordSchema } from '../schemas';
import { createFirstPassword } from '../server/first-access';
import { useAuthForm } from '../use-auth-form';
import { useCelebrateRedirect } from '../use-celebrate-redirect';
import { AuthErrorAlert } from './auth-error-alert';
import { PasswordField } from './password-field';
import { PasswordStrengthMeter } from './password-strength-meter';

type FirstAccessFormProps = {
  /** Email da conta: vai num campo escondido pro gerenciador de senhas salvar o par certo. */
  email: string;
  next?: string;
};

export function FirstAccessForm({ email, next }: FirstAccessFormProps) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    firstPasswordSchema,
    createFirstPassword,
  );
  const redirectTo = state?.redirectTo;
  useCelebrateRedirect(redirectTo);

  const errorCode = getAuthErrorCode(form.errors);

  return (
    <>
      <CardHeading
        title="Crie sua senha"
        description={`Esse é seu primeiro acesso. Troque a senha temporária por uma só sua, com pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`}
      />
      <form {...formProps} className="flex flex-col gap-5">
        {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

        <PasswordField
          meta={fields.password}
          label="Senha nova"
          autoComplete="new-password"
          hint="Dica: uma frase curta, tipo “minha loja vai bombar”, é fácil de lembrar e difícil de adivinhar."
          meter={
            <PasswordStrengthMeter password={fields.password.value ?? ''} userInputs={[email]} />
          }
        />

        <Button type="submit" loading={pending || Boolean(redirectTo)} loadingText="Salvando…">
          Salvar e entrar
        </Button>
      </form>
    </>
  );
}

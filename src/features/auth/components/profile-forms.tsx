'use client';

import { getInputProps } from '@conform-to/react';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { getAuthErrorCode } from '../error-codes';
import { changePasswordSchema, NAME_MAX_LENGTH, profileNameSchema } from '../schemas';
import { changePassword, updateName } from '../server/profile';
import { useAuthForm } from '../use-auth-form';
import { AuthErrorAlert } from './auth-error-alert';
import { FieldErrorMessage } from './field-error-message';
import { PasswordField } from './password-field';
import { PasswordStrengthMeter } from './password-strength-meter';

/** "Salvo", ao lado do botão, e o mesmo aviso pro leitor de tela (a região existe desde o início). */
function SavedNotice({ show, message }: { show: boolean; message: string }) {
  return (
    <>
      <LiveRegion>{show ? message : null}</LiveRegion>
      {show ? (
        <p
          aria-hidden="true"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-foreground"
        >
          <CheckCircle2Icon className="size-4 text-primary" />
          {message}
        </p>
      ) : null}
    </>
  );
}

export function ProfileNameForm({ name }: { name: string }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    profileNameSchema,
    updateName,
  );
  const errorCode = getAuthErrorCode(form.errors);
  const { key, ...inputProps } = getInputProps(fields.name, { type: 'text' });

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
      <Field>
        <FloatingLabelInput
          key={key}
          {...inputProps}
          defaultValue={inputProps.defaultValue ?? name}
          id={fields.name.id}
          label="Seu nome"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={NAME_MAX_LENGTH}
        />
        <FieldErrorMessage id={fields.name.errorId} errors={fields.name.errors} />
      </Field>
      <Button type="submit" variant="soft" loading={pending} loadingText="Salvando…">
        Salvar nome
      </Button>
      <SavedNotice show={Boolean(state?.saved) && !pending} message="Nome salvo" />
    </form>
  );
}

export function ChangePasswordForm({ email }: { email: string }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    changePasswordSchema,
    changePassword,
  );
  const errorCode = getAuthErrorCode(form.errors);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
      {/* Pro gerenciador de senhas saber de qual conta é a senha nova. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <PasswordField
        meta={fields.currentPassword}
        label="Senha atual"
        autoComplete="current-password"
      />
      <PasswordField
        meta={fields.password}
        label="Senha nova"
        autoComplete="new-password"
        hint={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar.`}
        meter={
          <PasswordStrengthMeter
            password={fields.password.value ?? ''}
            userInputs={[email]}
            showTip={!fields.password.errors?.length}
          />
        }
      />
      <Button type="submit" variant="soft" loading={pending} loadingText="Salvando…">
        Trocar senha
      </Button>
      <SavedNotice
        show={Boolean(state?.saved) && !pending}
        message="Senha trocada. Os outros aparelhos vão pedir a senha nova."
      />
    </form>
  );
}

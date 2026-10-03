'use client';

import { getInputProps } from '@conform-to/react';
import { CheckCircle2Icon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { rememberEmail } from '../email-storage';
import { getAuthErrorCode } from '../error-codes';
import { authHref } from '../links';
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

/**
 * O botão de salvar fica claro enquanto não há nada pra salvar e vira o azul cheio quando ela
 * muda algo: assim fica claro que falta salvar. Nunca desligado, pra continuar achável e
 * clicável (pelo teclado e pelo leitor de tela).
 */
function saveVariant(dirty: boolean) {
  return dirty ? 'default' : 'soft';
}

export function ProfileNameForm({ name }: { name: string }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    profileNameSchema,
    updateName,
  );
  const errorCode = getAuthErrorCode(form.errors);
  const { key, ...inputProps } = getInputProps(fields.name, { type: 'text' });
  const typed = fields.name.value;
  const dirty = typed !== undefined && typed.trim() !== name.trim();

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
          autoComplete="nickname"
          autoCapitalize="words"
          maxLength={NAME_MAX_LENGTH}
        />
        <FieldErrorMessage id={fields.name.errorId} errors={fields.name.errors} />
      </Field>
      <Button type="submit" variant={saveVariant(dirty)} loading={pending} loadingText="Salvando…">
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
  const dirty = Boolean(fields.currentPassword.value || fields.password.value);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
      {/* Pro gerenciador de senhas saber de qual conta é a senha nova. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <PasswordField
        meta={fields.currentPassword}
        label="Senha atual"
        autoComplete="current-password"
        below={
          // Quem não lembra a senha de hoje não troca por aqui: o link manda um email pra criar
          // uma nova, já com o email dela preenchido, e depois volta pro perfil.
          <div className="-my-1 flex justify-end">
            <Button asChild variant="link" size="inline" className="text-sm">
              <Link
                href={authHref('/recuperar-senha', '/perfil')}
                onClick={() => rememberEmail(email)}
              >
                Esqueceu a senha atual?
              </Link>
            </Button>
          </div>
        }
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
      <Button type="submit" variant={saveVariant(dirty)} loading={pending} loadingText="Salvando…">
        Trocar senha
      </Button>
      <SavedNotice
        show={Boolean(state?.saved) && !pending}
        message="Senha trocada. Os outros aparelhos vão pedir a senha nova."
      />
    </form>
  );
}

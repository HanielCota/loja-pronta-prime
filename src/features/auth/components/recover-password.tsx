'use client';

import { ArrowLeftIcon, MailIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CardHeading } from '@/components/brand/card-heading';
import { Button } from '@/components/ui/button';
import { RESET_LINK_TTL_HOURS } from '@/config/auth';
import { getAuthErrorCode } from '../error-codes';
import { authHref } from '../links';
import { formatHours } from '../messages';
import { rememberEmail, useRestoreRememberedEmail } from '../remembered-email';
import { recoverSchema } from '../schemas';
import { requestPasswordReset } from '../server/actions';
import { useAuthForm } from '../use-auth-form';
import { AuthErrorAlert } from './auth-error-alert';
import { AuthStatus } from './auth-status';
import { EmailField } from './email-field';

type RecoverPasswordProps = {
  next?: string;
};

export function RecoverPassword(props: RecoverPasswordProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <RecoverPasswordFlow
      key={attempt}
      {...props}
      onRestart={() => {
        rememberEmail('');
        setAttempt((n) => n + 1);
        // A tela é recriada (o botão clicado some): o foco vai pro campo de email, pra ela já
        // digitar o outro, em vez de cair no começo da página.
        requestAnimationFrame(() =>
          document.querySelector<HTMLInputElement>('input[name="email"]')?.focus(),
        );
      }}
    />
  );
}

function RecoverPasswordFlow({
  next,
  onRestart,
}: RecoverPasswordProps & { onRestart: () => void }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    recoverSchema,
    requestPasswordReset,
  );

  useRestoreRememberedEmail(fields.email.id, (email) =>
    form.update({ name: fields.email.name, value: email }),
  );

  if (state?.sentTo) {
    return <ResetLinkSent email={state.sentTo} next={next} onUseAnotherEmail={onRestart} />;
  }

  const errorCode = getAuthErrorCode(form.errors);

  return (
    <>
      <CardHeading
        title="Criar uma senha nova"
        description="Digite o email da compra pra receber um link. Serve também se a senha temporária não chegou."
      />
      <form {...formProps} className="flex flex-col gap-5">
        {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
        {/* O destino segue pelo link do email até depois de criar a senha. */}
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <EmailField
          meta={fields.email}
          onSuggestionAccept={(email) => form.update({ name: fields.email.name, value: email })}
        />

        <Button type="submit" loading={pending} loadingText="Enviando…">
          Me enviar o link
        </Button>

        <BackToLogin email={fields.email.value ?? ''} next={next} />
      </form>
    </>
  );
}

function ResetLinkSent({
  email,
  next,
  onUseAnotherEmail,
}: {
  email: string;
  next?: string;
  onUseAnotherEmail: () => void;
}) {
  return (
    <>
      <AuthStatus icon={<MailIcon aria-hidden="true" />} title="Confira seu email">
        Se <strong className="font-semibold wrap-anywhere text-foreground">{email}</strong> tiver
        uma conta, o link chega em alguns minutos. Ele vale por {formatHours(RESET_LINK_TTL_HOURS)}.
      </AuthStatus>
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
          Se não chegar, procure “Loja Pronta Prime” no spam e na aba Promoções.
        </p>
        <Button asChild>
          <Link href={authHref('/entrar', next)} onClick={() => rememberEmail(email)}>
            Voltar pro login
          </Link>
        </Button>
        <Button
          type="button"
          variant="link"
          size="inline"
          className="self-center"
          onClick={onUseAnotherEmail}
        >
          Usar outro email
        </Button>
      </div>
    </>
  );
}

function BackToLogin({ email, next }: { email: string; next?: string }) {
  return (
    <Button asChild variant="link" size="inline" className="self-center">
      <Link href={authHref('/entrar', next)} onClick={() => rememberEmail(email)}>
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Voltar pro login
      </Link>
    </Button>
  );
}

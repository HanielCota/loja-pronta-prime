'use client';

import { KeyRound, LockKeyhole, LockKeyholeOpen, LogOut, Save } from 'lucide-react';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { NAME_MAX_LENGTH } from '@/features/auth/schemas';
import { ConfirmAction } from '@/features/staff/components/confirm-action';
import {
  endAccountSessionsForm as endAccountSessions,
  generateStudentTemporaryPasswordForm as generateStudentTemporaryPassword,
  resetStudentPasswordForm as resetStudentPassword,
  saveAccountForm as saveAccount,
  setAccountBlockedForm as setAccountBlocked,
  type AccountActionState,
  type TemporaryPasswordState,
} from '../server/actions';
import { SelectMenu as Select } from '@/components/ui/select-menu';
import { Textarea } from '@/components/ui/textarea';

const initialState: AccountActionState = { message: '', saved: false };

/**
 * Retorno da ação, lido pelo leitor de tela. Vazio, não ocupa lugar: a margem negativa desfaz o
 * espaço entre os itens do formulário, e o aviso continua na página pra ser anunciado.
 */
function Result({ state }: { state: AccountActionState }) {
  return (
    <output
      aria-live="polite"
      className={
        state.message && !state.saved
          ? 'text-body text-destructive'
          : 'text-body text-muted-foreground empty:-mt-4'
      }
    >
      {state.message}
    </output>
  );
}

type AccountDetailsProps = {
  id: string;
  name: string;
  preferredName: string | null;
  email: string;
  admin: boolean;
  mustChangePassword: boolean;
  credentialVersion: string | null;
};

export function AccountDetailsForm(account: AccountDetailsProps) {
  const [state, formAction, pending] = useActionState(saveAccount, initialState);
  // A ação também volta normalmente quando há erro. Campos controlados preservam o que foi
  // digitado no reset automático do React, para corrigir só o campo que não serviu.
  const [fields, setFields] = useState(account);
  const mustChangePassword =
    fields.credentialVersion === account.credentialVersion
      ? fields.mustChangePassword
      : account.mustChangePassword;

  return (
    <form noValidate action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={account.id} />
      <input name="credentialVersion" type="hidden" value={account.credentialVersion ?? ''} />
      <FloatingLabelInput
        value={fields.name}
        onChange={(event) => setFields((previous) => ({ ...previous, name: event.target.value }))}
        id="account-name"
        label="Nome completo"
        maxLength={120}
        minLength={2}
        name="name"
        required
      />
      <FloatingLabelInput
        value={fields.preferredName ?? ''}
        onChange={(event) =>
          setFields((previous) => ({ ...previous, preferredName: event.target.value }))
        }
        id="account-preferred-name"
        label="Apelido (opcional)"
        maxLength={NAME_MAX_LENGTH}
        name="preferredName"
      />
      <FloatingLabelInput
        autoComplete="off"
        value={fields.email}
        onChange={(event) => setFields((previous) => ({ ...previous, email: event.target.value }))}
        id="account-email"
        label="Email"
        maxLength={254}
        name="email"
        required
        type="email"
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-role">Função</Label>
        <Select
          value={fields.admin ? 'admin' : 'student'}
          onChange={(event) =>
            setFields((previous) => ({ ...previous, admin: event.target.value === 'admin' }))
          }
          id="account-role"
          name="role"
        >
          <option value="student">Aluna</option>
          <option value="admin">Admin (acessa este painel)</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-password">Senha no próximo acesso</Label>
        <Select
          value={mustChangePassword ? 'yes' : 'no'}
          onChange={(event) =>
            setFields((previous) => ({
              ...previous,
              credentialVersion: account.credentialVersion,
              mustChangePassword: event.target.value === 'yes',
            }))
          }
          id="account-password"
          name="mustChangePassword"
        >
          <option value="no">Continua com a senha atual</option>
          <option value="yes">Precisa criar uma senha nova</option>
        </Select>
      </div>
      <Button disabled={pending} loading={pending} type="submit">
        <Save aria-hidden="true" data-icon="inline-start" />
        Salvar alterações
      </Button>
      <Result state={state} />
    </form>
  );
}

export function AccountBlockForm({ id, blocked }: { id: string; blocked: boolean }) {
  const [state, formAction, pending] = useActionState(setAccountBlocked, initialState);

  return (
    <form noValidate action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={id} />
      <input name="blocked" type="hidden" value={blocked ? 'no' : 'yes'} />
      {blocked ? null : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-block-reason">Motivo do bloqueio</Label>
          <Textarea
            className="min-h-24"
            id="account-block-reason"
            maxLength={500}
            minLength={3}
            name="reason"
            required
          />
        </div>
      )}
      <Button
        disabled={pending}
        loading={pending}
        type="submit"
        variant={blocked ? 'soft' : 'destructive'}
      >
        {blocked ? (
          <LockKeyholeOpen aria-hidden="true" data-icon="inline-start" />
        ) : (
          <LockKeyhole aria-hidden="true" data-icon="inline-start" />
        )}
        {blocked ? 'Desbloquear conta' : 'Bloquear conta'}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function AccountSessionsForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(endAccountSessions, initialState);

  return (
    <form noValidate action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={id} />
      <Button disabled={pending} loading={pending} type="submit" variant="soft">
        <LogOut aria-hidden="true" data-icon="inline-start" />
        Desconectar de todos os aparelhos
      </Button>
      <Result state={state} />
    </form>
  );
}

export function AccountPasswordResetForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(resetStudentPassword, initialState);

  return (
    <form noValidate action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={id} />
      <Button disabled={pending} loading={pending} type="submit" variant="soft">
        <KeyRound aria-hidden="true" data-icon="inline-start" />
        Desativar senha para recuperação por email
      </Button>
      <Result state={state} />
    </form>
  );
}

export function AccountTemporaryPasswordForm({
  id,
  credentialVersion,
}: {
  id: string;
  credentialVersion: string | null;
}) {
  const [state, formAction, pending] = useActionState<TemporaryPasswordState, FormData>(
    generateStudentTemporaryPassword,
    initialState,
  );

  return (
    <form action={formAction} aria-label="Gerar senha temporária" className="flex flex-col gap-4">
      <input name="id" type="hidden" value={id} />
      <input name="credentialVersion" type="hidden" value={credentialVersion ?? ''} />
      <ConfirmAction
        label="Gerar senha temporária"
        title="Gerar uma nova senha para esta aluna?"
        description="A senha atual e os links anteriores deixam de funcionar. A aluna sai de todos os aparelhos e cria a própria senha ao entrar com a temporária."
        variant="soft"
      >
        <Button disabled={pending} loading={pending} type="submit">
          Confirmar e gerar senha
        </Button>
      </ConfirmAction>
      <Result state={state} />
      {state.password ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body text-muted-foreground">
            Copie a senha agora e envie em particular para a aluna. Ela só aparece aqui.
          </p>
          <code className="text-body wrap-anywhere text-foreground select-all">
            {state.password}
          </code>
        </div>
      ) : null}
    </form>
  );
}

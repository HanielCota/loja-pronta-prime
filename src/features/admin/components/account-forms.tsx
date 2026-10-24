'use client';

import { KeyRound, LockKeyhole, LockKeyholeOpen, LogOut, Save } from 'lucide-react';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { NAME_MAX_LENGTH } from '@/features/auth/schemas';
import {
  endAccountSessionsForm as endAccountSessions,
  resetStudentPasswordForm as resetStudentPassword,
  saveAccountForm as saveAccount,
  setAccountBlockedForm as setAccountBlocked,
  type AccountActionState,
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
};

export function AccountDetailsForm(account: AccountDetailsProps) {
  const [state, formAction, pending] = useActionState(saveAccount, initialState);
  // A ação também volta normalmente quando há erro. Campos controlados preservam o que foi
  // digitado no reset automático do React, para corrigir só o campo que não serviu.
  const [fields, setFields] = useState(account);

  return (
    <form noValidate action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={account.id} />
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
          value={fields.mustChangePassword ? 'yes' : 'no'}
          onChange={(event) =>
            setFields((previous) => ({
              ...previous,
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
        Voltar para a senha inicial
      </Button>
      <Result state={state} />
    </form>
  );
}

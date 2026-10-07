'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import {
  endAccountSessionsForm as endAccountSessions,
  saveAccountForm as saveAccount,
  setAccountBlockedForm as setAccountBlocked,
  type AccountActionState,
} from '../server/actions';

const initialState: AccountActionState = { message: '', saved: false };

// O mesmo campo de escolha da tela de acessos.
const selectClass =
  'min-h-12 rounded-field border border-input bg-background px-4 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring';

function Result({ state }: { state: AccountActionState }) {
  return (
    <output
      aria-live="polite"
      className={
        state.message && !state.saved
          ? 'min-h-6 text-body text-destructive'
          : 'min-h-6 text-body text-muted-foreground'
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
    <form action={formAction} className="flex flex-col gap-4">
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
        maxLength={60}
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
        <select
          className={selectClass}
          value={fields.admin ? 'admin' : 'student'}
          onChange={(event) =>
            setFields((previous) => ({ ...previous, admin: event.target.value === 'admin' }))
          }
          id="account-role"
          name="role"
        >
          <option value="student">Aluna</option>
          <option value="admin">Admin (acessa este painel)</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-password">Senha no próximo acesso</Label>
        <select
          className={selectClass}
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
        </select>
      </div>
      <Button disabled={pending} loading={pending} type="submit">
        Salvar alterações
      </Button>
      <Result state={state} />
    </form>
  );
}

export function AccountBlockForm({ id, blocked }: { id: string; blocked: boolean }) {
  const [state, formAction, pending] = useActionState(setAccountBlocked, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={id} />
      <input name="blocked" type="hidden" value={blocked ? 'no' : 'yes'} />
      {blocked ? null : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-block-reason">Motivo do bloqueio</Label>
          <textarea
            className="min-h-24 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            id="account-block-reason"
            maxLength={500}
            minLength={3}
            name="reason"
            required
          />
        </div>
      )}
      <Button disabled={pending} loading={pending} type="submit" variant="soft">
        {blocked ? 'Desbloquear conta' : 'Bloquear conta'}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function AccountSessionsForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(endAccountSessions, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={id} />
      <Button disabled={pending} loading={pending} type="submit" variant="soft">
        Desconectar de todos os aparelhos
      </Button>
      <Result state={state} />
    </form>
  );
}

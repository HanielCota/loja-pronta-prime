'use client';

import { useActionState } from 'react';
import { MailIcon, KeyRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Select } from '@/components/ui/select';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { PRODUCTS } from '@/features/products/catalog';
import { PRODUCT_IDS } from '@/config/products';
import { createAccountForm, type NewAccountState } from '../server/actions';

const initialState: NewAccountState = { attempt: 0 };

// A mesma moldura das opções grandes: o cartão inteiro é o alvo do toque.
const optionClass =
  'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 text-body text-foreground hover:bg-muted has-checked:border-primary has-checked:bg-primary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring';

/**
 * Conta nova pelo painel: nome, email, função, produtos e como ela entra pela primeira vez. O
 * campo da senha temporária só aparece com essa opção marcada (por CSS: funciona sem JavaScript).
 * Depois de um erro, o formulário volta com o que foi digitado (menos a senha).
 */
export function NewAccountForm() {
  const [state, formAction, pending] = useActionState(createAccountForm, initialState);
  const values = state.values;
  const errors = state.errors ?? {};

  return (
    // A chave recomeça o formulário a cada resposta, com o que foi digitado como valor inicial.
    <form action={formAction} className="flex flex-col gap-6" key={state.attempt}>
      <div className="flex flex-col gap-4">
        <Field>
          <FloatingLabelInput
            aria-describedby={errors.name ? 'new-name-error' : undefined}
            aria-invalid={errors.name ? true : undefined}
            autoComplete="off"
            defaultValue={values?.name}
            id="new-name"
            label="Nome completo"
            maxLength={120}
            minLength={2}
            name="name"
            required
          />
          <FieldError id="new-name-error">{errors.name}</FieldError>
        </Field>
        <Field>
          <FloatingLabelInput
            aria-describedby={errors.email ? 'new-email-error' : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="off"
            defaultValue={values?.email}
            id="new-email"
            label="Email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
          <FieldError id="new-email-error">{errors.email}</FieldError>
        </Field>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-role">Função</Label>
          <Select defaultValue={values?.role ?? 'student'} id="new-role" name="role">
            <option value="student">Aluna</option>
            <option value="admin">Admin (acessa este painel)</option>
          </Select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-body font-semibold text-foreground">Produtos liberados</legend>
        {PRODUCT_IDS.map((id) => (
          <label className={optionClass} key={id}>
            <input
              defaultChecked={values ? values.products.includes(id) : false}
              name="products"
              type="checkbox"
              value={id}
            />
            {PRODUCTS[id].name}
          </label>
        ))}
        <p className="text-sm text-muted-foreground">
          Sem nenhum, a conta entra mas ainda não vê as áreas. Dá pra liberar depois.
        </p>
      </fieldset>

      <fieldset className="group/access flex flex-col gap-3">
        <legend className="mb-1 text-body font-semibold text-foreground">
          Como ela entra pela primeira vez
        </legend>
        <label className={optionClass}>
          <input
            defaultChecked={(values?.access ?? 'email') === 'email'}
            name="access"
            type="radio"
            value="email"
          />
          <MailIcon aria-hidden="true" className="size-5 shrink-0 text-link" />
          <span>Enviar um email para ela criar a própria senha</span>
        </label>
        <label className={optionClass}>
          <input
            defaultChecked={values?.access === 'password'}
            id="access-password"
            name="access"
            type="radio"
            value="password"
          />
          <KeyRoundIcon aria-hidden="true" className="size-5 shrink-0 text-link" />
          <span>Definir uma senha temporária agora</span>
        </label>
        <Field className="hidden group-has-[#access-password:checked]/access:flex">
          <PasswordInput
            aria-describedby={['new-password-hint', errors.password && 'new-password-error']
              .filter(Boolean)
              .join(' ')}
            aria-invalid={errors.password ? true : undefined}
            autoComplete="new-password"
            id="new-password"
            label="Senha temporária"
            name="password"
          />
          <p className="px-1 text-sm text-muted-foreground" id="new-password-hint">
            Mínimo de {PASSWORD_MIN_LENGTH} caracteres. Ela vai criar outra no primeiro acesso.
            Passe a senha pra ela por um canal seguro.
          </p>
          <FieldError id="new-password-error">{errors.password}</FieldError>
        </Field>
      </fieldset>

      <FieldError>{errors.form}</FieldError>
      <Button disabled={pending} loading={pending} type="submit">
        Criar conta
      </Button>
    </form>
  );
}

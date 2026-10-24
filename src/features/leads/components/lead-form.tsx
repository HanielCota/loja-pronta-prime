'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Field, FieldError } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { SelectMenu } from '@/components/ui/select-menu';
import { saveLead } from '../server/actions';
import {
  EMPTY_LEAD,
  LEAD_PRODUCTS,
  LEAD_STAGES,
  interestLabels,
  stageLabels,
  type LeadValues,
} from '../model';

export function LeadForm({
  id,
  version,
  initial = EMPTY_LEAD,
  owners,
}: {
  id?: string;
  version?: string;
  initial?: LeadValues;
  owners: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveLead, { attempt: 0 });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.errors) ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);
  const textField = (name: keyof LeadValues, label: string, type = 'text', maxLength = 120) => (
    <Field>
      <FloatingLabelInput
        id={`lead-${name}`}
        label={label}
        name={name}
        type={type}
        maxLength={maxLength}
        defaultValue={values[name]}
        aria-invalid={Boolean(errors[name]) || undefined}
        aria-describedby={errors[name] ? `lead-${name}-error` : undefined}
        autoComplete="off"
      />
      <FieldError id={`lead-${name}-error`}>{errors[name]}</FieldError>
    </Field>
  );
  return (
    <form action={action} noValidate ref={ref} key={state.attempt} className="flex flex-col gap-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {version ? <input type="hidden" name="version" value={version} /> : null}
      {state.message ? (
        <p role="alert" className="rounded-2xl bg-destructive-soft p-4 text-body text-destructive">
          {state.message}
        </p>
      ) : null}
      {textField('name', 'Nome do contato')}
      <div className="grid gap-4 sm:grid-cols-2">
        {textField('email', 'Email', 'email', 254)}
        {textField('phone', 'WhatsApp com DDD', 'tel', 40)}
      </div>
      <p className="text-sm text-muted-foreground">
        Informe pelo menos um meio de contato. O WhatsApp usa celular brasileiro com DDD.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {textField('source', 'Origem do contato', 'text', 100)}
        <div className="flex flex-col gap-2">
          <Label htmlFor="lead-product">Produto de interesse</Label>
          <SelectMenu id="lead-product" name="product" defaultValue={values.product}>
            {LEAD_PRODUCTS.map((product) => (
              <option key={product} value={product}>
                {interestLabels[product]}
              </option>
            ))}
          </SelectMenu>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lead-stage">Etapa da venda</Label>
          <SelectMenu id="lead-stage" name="stage" defaultValue={values.stage}>
            {LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]}
              </option>
            ))}
          </SelectMenu>
        </div>
        {textField('nextContact', 'Próximo contato', 'date')}
        <Field>
          <Label htmlFor="lead-owner">Responsável</Label>
          <SelectMenu
            id="lead-owner"
            name="ownerId"
            defaultValue={values.ownerId}
            aria-invalid={Boolean(errors.ownerId) || undefined}
            aria-describedby={errors.ownerId ? 'lead-owner-error' : undefined}
          >
            <option value="">Sem responsável</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </SelectMenu>
          <FieldError id="lead-owner-error">{errors.ownerId}</FieldError>
        </Field>
        {textField('tags', 'Etiquetas separadas por vírgula', 'text', 250)}
      </div>
      {textField('lostReason', 'Motivo, se não teve interesse', 'text', 500)}
      <p className="text-sm text-muted-foreground">
        Vendas concluídas e contatos sem interesse saem dos lembretes. Marcar uma venda aqui não
        libera cursos nem confirma pagamento.
      </p>
      <Button type="submit" loading={pending} loadingText="Salvando…">
        <Save aria-hidden="true" />
        {id ? 'Salvar contato' : 'Cadastrar contato'}
      </Button>
    </form>
  );
}

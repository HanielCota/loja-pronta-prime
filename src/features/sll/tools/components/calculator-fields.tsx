import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import type { CalculatorKind } from '../form-input';
import type { CalculatorState } from '../state';
import { SelectMenu } from '@/components/ui/select-menu';
import { ChevronDownIcon } from 'lucide-react';

function NumberField({
  name,
  label,
  help,
  state,
  defaultValue = '',
  required = false,
}: {
  name: string;
  label: string;
  help?: string;
  state: CalculatorState;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FloatingLabelInput
        key={`${name}-${state.values[name] ?? defaultValue}`}
        id={`calculator-${name}`}
        name={name}
        label={label}
        inputMode="decimal"
        maxLength={12}
        defaultValue={state.values[name] ?? defaultValue}
        required={required}
        aria-invalid={Boolean(state.errors[name])}
        aria-describedby={state.errors[name] ? `${name}-error` : help ? `${name}-help` : undefined}
      />
      {state.errors[name] ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {state.errors[name]}
        </p>
      ) : help ? (
        <p id={`${name}-help`} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export function CalculatorFields({
  kind,
  state,
}: {
  kind: CalculatorKind;
  state: CalculatorState;
}) {
  return (
    <>
      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-4 text-headline font-semibold text-foreground">
          Sua conta na Shopee
        </legend>
        <label
          className="flex flex-col gap-2 text-body text-foreground"
          htmlFor="calculator-policy"
        >
          Tipo de conta e taxas
          <SelectMenu
            id="calculator-policy"
            name="policy"
            defaultValue={state.values.policy ?? 'cnpj'}
            aria-describedby="calculator-policy-help"
          >
            <option value="cnpj">Empresa (CNPJ)</option>
            <option value="cpf">Pessoa física (CPF): até 450 pedidos em 90 dias</option>
            <option value="cpf-volume">Pessoa física (CPF): mais de 450 pedidos em 90 dias</option>
            <option value="custom">Taxas personalizadas da minha loja</option>
          </SelectMenu>
        </label>
        <p id="calculator-policy-help" className="text-sm text-muted-foreground">
          CPF: para preços abaixo de R$ 9,00 (ou R$ 12,00 com mais de 450 pedidos), use taxas
          personalizadas. A regra regressiva precisa ser conferida na sua loja.
        </p>
        <details
          className="group rounded-2xl border border-border p-4"
          open={
            state.values.policy === 'custom' ||
            Boolean(state.errors.commission || state.errors.fixed)
          }
        >
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-body font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            Preencher taxas personalizadas
            <ChevronDownIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
            />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField
              name="commission"
              label="Comissão (%)"
              state={state}
              help="Inclua a taxa de transação, se já fizer parte da comissão."
            />
            <NumberField
              name="fixed"
              label="Taxa por item (R$)"
              state={state}
              help="Usadas somente ao selecionar taxas personalizadas."
            />
          </div>
        </details>
      </fieldset>
      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-4 text-headline font-semibold text-foreground">
          Custos de uma unidade
        </legend>
        <NumberField name="product" label="Custo do produto (R$)" state={state} required />
        <div className="grid gap-4">
          <NumberField name="packaging" label="Embalagem (R$)" state={state} />
          <NumberField name="shipping" label="Frete pago por você (R$)" state={state} />
          <NumberField name="other" label="Outros custos por venda (R$)" state={state} />
          {kind !== 'ads' ? (
            <NumberField name="advertising" label="Anúncios por venda (R$)" state={state} />
          ) : null}
          <NumberField name="tax" label="Impostos sobre a venda (%)" state={state} />
          <NumberField name="extraFee" label="Campanhas e outras taxas (%)" state={state} />
        </div>
        <p className="text-sm text-muted-foreground">
          Os custos opcionais vazios valem zero. Informe sua parte no frete e nos custos da loja.
          Todos os percentuais incidem sobre o preço final recebido.
        </p>
      </fieldset>
      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-4 text-headline font-semibold text-foreground">
          {kind === 'discount'
            ? 'Sua promoção'
            : kind === 'ads'
              ? 'Preço e lucro desejado'
              : 'Quanto você quer lucrar?'}
        </legend>
        {kind !== 'price' ? (
          <NumberField name="price" label="Preço de venda (R$)" state={state} required />
        ) : null}
        {kind === 'discount' ? (
          <div className="grid gap-4">
            <NumberField name="discount" label="Desconto (%)" state={state} />
            <NumberField name="coupon" label="Cupom pago por você (R$)" state={state} />
          </div>
        ) : (
          <NumberField
            name="margin"
            label="Margem de lucro desejada (%)"
            state={state}
            defaultValue="20"
            required
            help="É a parte do preço final que deve sobrar depois dos custos. Não é um acréscimo sobre o custo."
          />
        )}
        {kind === 'discount' ? (
          <p className="text-sm text-muted-foreground">
            O cupom entra depois do desconto. Informe apenas a parte de uma unidade paga por você. O
            subsídio Pix bancado pela Shopee não entra como custo seu.
          </p>
        ) : null}
      </fieldset>
    </>
  );
}

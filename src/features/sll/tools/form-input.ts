import { parseDecimalInput } from './number-input';
import { MAX_PRICE_CENTS, type FeePolicy } from './fees';
import type { SaleCosts } from './calculations';

export type CalculatorKind = 'price' | 'discount' | 'ads';

/** Passou do teto: diz qual é, em vez de chamar de inválido um número bem escrito. */
function aboveLimitMessage(max: number) {
  if (max === MAX_PRICE_CENTS) return 'Use no máximo R$ 1.000.000,00.';
  if (max < 10_000) return 'Use um percentual menor que 100%.';
  return 'Use no máximo 100%.';
}

export function readCalculatorInput(form: FormData, kind: CalculatorKind) {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  function field(name: string) {
    const value = form.get(name);
    values[name] = typeof value === 'string' ? value.slice(0, 80) : '';
    return values[name]!;
  }
  function number(name: string, max = MAX_PRICE_CENTS, optional = false, positive = false) {
    const raw = field(name);
    const parsed = optional && !raw.trim() ? 0 : parseDecimalInput(raw);
    if (parsed !== null && parsed > max) {
      errors[name] = aboveLimitMessage(max);
      return 0;
    }
    if (parsed === null || (positive && parsed === 0)) {
      errors[name] = positive
        ? 'Informe um valor maior que zero, com até duas casas decimais.'
        : 'Informe um valor válido, com até duas casas decimais.';
      return 0;
    }
    return parsed;
  }
  // Sem tipo de conta válido, fica a regra padrão da Shopee e o erro avisa a aluna.
  function feePolicy(selected: string): FeePolicy {
    if (selected === 'custom')
      return {
        mode: 'custom',
        commissionBps: number('commission', 10_000),
        fixedCents: number('fixed'),
      };
    if (['cnpj', 'cpf', 'cpf-volume'].includes(selected))
      return {
        mode: 'shopee',
        seller: selected === 'cnpj' ? 'cnpj' : 'cpf',
        moreThan450Orders: selected === 'cpf-volume',
      };
    errors.policy = 'Escolha o tipo da sua conta.';
    return { mode: 'shopee', seller: 'cnpj', moreThan450Orders: false };
  }
  const policy = feePolicy(field('policy'));
  const costs: SaleCosts = {
    policy,
    productCents: number('product', MAX_PRICE_CENTS, false, true),
    packagingCents: number('packaging', MAX_PRICE_CENTS, true),
    shippingCents: number('shipping', MAX_PRICE_CENTS, true),
    otherCents: number('other', MAX_PRICE_CENTS, true),
    advertisingCents: kind === 'ads' ? 0 : number('advertising', MAX_PRICE_CENTS, true),
    taxBps: number('tax', 10_000, true),
    extraFeeBps: number('extraFee', 10_000, true),
  };
  const priceCents = kind === 'price' ? 0 : number('price', MAX_PRICE_CENTS, false, true);
  const marginBps = kind === 'discount' ? 0 : number('margin', 9999);
  const discountBps = kind === 'discount' ? number('discount', 9999, true) : 0;
  const couponCents = kind === 'discount' ? number('coupon', MAX_PRICE_CENTS, true) : 0;
  return { values, errors, costs, priceCents, marginBps, discountBps, couponCents };
}

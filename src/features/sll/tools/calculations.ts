import { feeAt, feeBands, MAX_PRICE_CENTS, type FeePolicy } from './fees';

export type SaleCosts = {
  productCents: number;
  packagingCents: number;
  shippingCents: number;
  otherCents: number;
  advertisingCents: number;
  taxBps: number;
  extraFeeBps: number;
  policy: FeePolicy;
};

export type SaleResult = ReturnType<typeof calculateSale>;

function validateCosts(costs: SaleCosts) {
  for (const value of [
    costs.productCents,
    costs.packagingCents,
    costs.shippingCents,
    costs.otherCents,
    costs.advertisingCents,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_PRICE_CENTS)
      throw new Error('Confira os custos informados.');
  }
  for (const value of [costs.taxBps, costs.extraFeeBps]) {
    if (!Number.isInteger(value) || value < 0 || value > 10_000)
      throw new Error('Confira os percentuais informados.');
  }
  if (
    costs.policy.mode === 'custom' &&
    (!Number.isInteger(costs.policy.commissionBps) ||
      costs.policy.commissionBps < 0 ||
      costs.policy.commissionBps > 10_000 ||
      !Number.isSafeInteger(costs.policy.fixedCents) ||
      costs.policy.fixedCents < 0 ||
      costs.policy.fixedCents > MAX_PRICE_CENTS)
  )
    throw new Error('Confira as taxas personalizadas.');
}

/** Uma venda de uma unidade. Cupom bancado pela loja já está descontado do preço recebido. */
export function calculateSale(priceCents: number, costs: SaleCosts) {
  validateCosts(costs);
  if (!Number.isSafeInteger(priceCents) || priceCents < 1 || priceCents > MAX_PRICE_CENTS)
    throw new Error('Informe um preço maior que zero, até R$ 1.000.000.');
  const fee = feeAt(priceCents, costs.policy);
  const taxCents = Math.round((priceCents * costs.taxBps) / 10_000);
  const extraFeeCents = Math.round((priceCents * costs.extraFeeBps) / 10_000);
  const operationalCents =
    costs.productCents + costs.packagingCents + costs.shippingCents + costs.otherCents;
  const totalCents =
    operationalCents +
    fee.commissionCents +
    fee.fixedCents +
    taxCents +
    extraFeeCents +
    costs.advertisingCents;
  const profitCents = priceCents - totalCents;
  return {
    priceCents,
    ...fee,
    taxCents,
    extraFeeCents,
    operationalCents,
    advertisingCents: costs.advertisingCents,
    totalCents,
    profitCents,
    marginPercent: (profitCents / priceCents) * 100,
  };
}

/** Busca em cada faixa: cobrar mais pode reduzir o lucro quando muda a taxa fixa. */
export function suggestPrice(costs: SaleCosts, targetMarginBps: number): SaleResult {
  validateCosts(costs);
  if (!Number.isInteger(targetMarginBps) || targetMarginBps < 0 || targetMarginBps >= 10_000)
    throw new Error('A margem desejada deve ficar entre 0% e 99,99%.');
  let best: SaleResult | undefined;
  for (const band of feeBands(costs.policy)) {
    const variableBps =
      band.commissionBps +
      (band.fixedRateBps ?? 0) +
      costs.taxBps +
      costs.extraFeeBps +
      targetMarginBps;
    if (variableBps >= 10_000) continue;
    const enough = (price: number) =>
      calculateSale(price, costs).profitCents >= Math.ceil((price * targetMarginBps) / 10_000);
    const fixed =
      costs.productCents +
      costs.packagingCents +
      costs.shippingCents +
      costs.otherCents +
      costs.advertisingCents +
      band.fixedCents;
    const available = 10_000 - variableBps;
    // Quatro arredondamentos podem oscilar: uma busca binária perderia o primeiro preço válido.
    // Estes limites cobrem todo o erro possível (2 centavos nas taxas + 1 na margem).
    const start = Math.max(band.min, Math.ceil(((fixed - 2) * 10_000) / available));
    const end = Math.min(band.max, Math.ceil(((fixed + 3) * 10_000) / available));
    for (let price = start; price <= end; price++) {
      if (enough(price)) {
        const candidate = calculateSale(price, costs);
        if (!best || price < best.priceCents) best = candidate;
        break;
      }
    }
  }
  if (!best)
    throw new Error(
      'Com esses custos e percentuais, não há preço que alcance a margem desejada. Confira as taxas ou reduza a margem.',
    );
  return best;
}

export function simulateDiscount(
  priceCents: number,
  discountBps: number,
  couponCents: number,
  costs: SaleCosts,
) {
  if (
    !Number.isInteger(discountBps) ||
    discountBps < 0 ||
    discountBps >= 10_000 ||
    !Number.isSafeInteger(couponCents) ||
    couponCents < 0 ||
    couponCents > MAX_PRICE_CENTS
  )
    throw new Error('Confira o desconto e o cupom.');
  const original = calculateSale(priceCents, costs);
  const discountCents = Math.round((priceCents * discountBps) / 10_000);
  const finalPrice = priceCents - discountCents - couponCents;
  if (finalPrice < 1) throw new Error('O desconto e o cupom devem deixar um preço maior que zero.');
  const discounted = calculateSale(finalPrice, costs);
  return {
    original,
    discounted,
    discountCents,
    couponCents,
    profitDifferenceCents: discounted.profitCents - original.profitCents,
  };
}

export function advertisingLimits(priceCents: number, costs: SaleCosts, targetMarginBps: number) {
  if (!Number.isInteger(targetMarginBps) || targetMarginBps < 0 || targetMarginBps >= 10_000)
    throw new Error('Confira a margem desejada.');
  const sale = calculateSale(priceCents, { ...costs, advertisingCents: 0 });
  const remainingCents = sale.profitCents;
  const targetProfitCents = Math.ceil((priceCents * targetMarginBps) / 10_000);
  const targetBudgetCents = Math.max(0, remainingCents - targetProfitCents);
  return {
    sale,
    breakEvenBudgetCents: Math.max(0, remainingCents),
    targetBudgetCents,
    targetProfitCents,
    breakEvenRoas: remainingCents > 0 ? priceCents / remainingCents : null,
    targetRoas: targetBudgetCents > 0 ? priceCents / targetBudgetCents : null,
  };
}

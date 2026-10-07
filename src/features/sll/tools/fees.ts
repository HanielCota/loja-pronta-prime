/** Política conferida na fonte oficial em 07/10/2026. Valores em centavos e pontos-base. */
export const SHOPEE_FEES = {
  checkedAt: '07/10/2026',
  effectiveAt: '01/10/2026',
  source: 'https://seller.shopee.com.br/edu/article/26839',
  cpfSource: 'https://seller.shopee.com.br/edu/article/18484',
} as const;

export type FeePolicy =
  | { mode: 'shopee'; seller: 'cnpj' | 'cpf'; moreThan450Orders: boolean }
  | { mode: 'custom'; commissionBps: number; fixedCents: number };

export type FeeBand = {
  min: number;
  max: number;
  commissionBps: number;
  fixedCents: number;
  fixedRateBps?: number;
};

export const MAX_PRICE_CENTS = 100_000_000;

/** Cada faixa é contínua. A recomendação de preço considera todas, inclusive os degraus. */
export function feeBands(policy: FeePolicy): FeeBand[] {
  if (policy.mode === 'custom') {
    return [{ min: 1, max: MAX_PRICE_CENTS, ...policy }];
  }
  const cpf = policy.seller === 'cpf';
  const additional = cpf && policy.moreThan450Orders ? 300 : 0;
  return [
    // A regra regressiva do CPF tem exemplos sem fórmula completa: exige taxa personalizada.
    ...(!cpf ? [{ min: 1, max: 899, commissionBps: 2000, fixedCents: 0, fixedRateBps: 5000 }] : []),
    {
      min: cpf && additional ? 1200 : 900,
      max: 7999,
      commissionBps: 2000,
      fixedCents: 450 + additional,
    },
    { min: 8000, max: 9999, commissionBps: 1400, fixedCents: 1600 + additional },
    { min: 10000, max: 19999, commissionBps: 1400, fixedCents: 2000 + additional },
    { min: 20000, max: MAX_PRICE_CENTS, commissionBps: 1400, fixedCents: 2600 + additional },
  ];
}

export function feeAt(priceCents: number, policy: FeePolicy) {
  const band = feeBands(policy).find(({ min, max }) => priceCents >= min && priceCents <= max);
  if (!band)
    throw new Error(
      'Para este preço no CPF, selecione Taxas personalizadas e informe a cobrança da sua loja.',
    );
  return {
    commissionCents: Math.round((priceCents * band.commissionBps) / 10_000),
    fixedCents: band.fixedCents + Math.round((priceCents * (band.fixedRateBps ?? 0)) / 10_000),
  };
}

import type { SaleResult, advertisingLimits, simulateDiscount } from './calculations';

export type CalculatorResult =
  | { kind: 'price'; sale: SaleResult }
  | { kind: 'discount'; simulation: ReturnType<typeof simulateDiscount> }
  | { kind: 'ads'; limits: ReturnType<typeof advertisingLimits> };

export type CalculatorState = {
  values: Record<string, string>;
  errors: Record<string, string>;
  message: string;
  result?: CalculatorResult;
};

export const EMPTY_CALCULATOR: CalculatorState = { values: {}, errors: {}, message: '' };

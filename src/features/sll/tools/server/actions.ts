'use server';

import { requireProductAction } from '@/features/products/server/access';
import { suggestPrice, simulateDiscount, advertisingLimits } from '../calculations';
import { readCalculatorInput, type CalculatorKind } from '../form-input';
import type { CalculatorResult, CalculatorState } from '../state';

async function calculate(kind: CalculatorKind, form: FormData): Promise<CalculatorState> {
  await requireProductAction('sll');
  const input = readCalculatorInput(form, kind);
  const state = { values: input.values, errors: input.errors, message: '' };
  if (Object.keys(input.errors).length)
    return { ...state, message: 'Confira os campos indicados.' };
  try {
    let result: CalculatorResult;
    if (kind === 'price') result = { kind, sale: suggestPrice(input.costs, input.marginBps) };
    else if (kind === 'discount')
      result = {
        kind,
        simulation: simulateDiscount(
          input.priceCents,
          input.discountBps,
          input.couponCents,
          input.costs,
        ),
      };
    else
      result = { kind, limits: advertisingLimits(input.priceCents, input.costs, input.marginBps) };
    return { ...state, result };
  } catch (error) {
    return {
      ...state,
      message:
        error instanceof Error
          ? error.message
          : 'Não consegui calcular. Confira os valores e tente de novo.',
    };
  }
}

export async function calculatePrice(_previous: CalculatorState, form: FormData) {
  return calculate('price', form);
}
export async function calculateDiscount(_previous: CalculatorState, form: FormData) {
  return calculate('discount', form);
}
export async function calculateAds(_previous: CalculatorState, form: FormData) {
  return calculate('ads', form);
}

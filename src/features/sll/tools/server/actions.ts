'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { requireProductAction } from '@/features/products/server/access';
import { suggestPrice, simulateDiscount, advertisingLimits } from '../calculations';
import { readCalculatorInput, type CalculatorKind } from '../form-input';
import type { CalculatorResult, CalculatorState } from '../state';

// Cada calculadora usa só os campos dela; o erro de cálculo sobe pra mensagem da tela.
function calculatorResult(
  kind: CalculatorKind,
  input: ReturnType<typeof readCalculatorInput>,
): CalculatorResult {
  if (kind === 'price') return { kind, sale: suggestPrice(input.costs, input.marginBps) };
  if (kind === 'discount')
    return {
      kind,
      simulation: simulateDiscount(
        input.priceCents,
        input.discountBps,
        input.couponCents,
        input.costs,
      ),
    };
  return { kind, limits: advertisingLimits(input.priceCents, input.costs, input.marginBps) };
}

async function calculate(kind: CalculatorKind, form: FormData): Promise<CalculatorState> {
  await requireProductAction('sll');
  const input = readCalculatorInput(form, kind);
  const state = { values: input.values, errors: input.errors, message: '' };
  if (Object.keys(input.errors).length)
    return { ...state, message: 'Confira os campos indicados.' };
  try {
    const result = calculatorResult(kind, input);
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
  return runAsStudent('calculatePrice', async () => {
    return calculate('price', form);
  });
}
export async function calculateDiscount(_previous: CalculatorState, form: FormData) {
  return runAsStudent('calculateDiscount', async () => {
    return calculate('discount', form);
  });
}
export async function calculateAds(_previous: CalculatorState, form: FormData) {
  return runAsStudent('calculateAds', async () => {
    return calculate('ads', form);
  });
}

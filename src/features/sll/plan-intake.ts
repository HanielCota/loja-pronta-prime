const STORE_AGE_VALUES = ['under_7_days', 'exactly_7_days', 'over_7_days'] as const;

export type SllPlanStoreAge = (typeof STORE_AGE_VALUES)[number];

/** A resposta recebida precisa ser uma das opções reais, inclusive sem JavaScript. */
export function isSllPlanStoreAge(value: unknown): value is SllPlanStoreAge {
  return typeof value === 'string' && STORE_AGE_VALUES.includes(value as SllPlanStoreAge);
}

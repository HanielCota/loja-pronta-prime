export const EXPERT_IDS = ['pri', 'ze'] as const;
export type ExpertId = (typeof EXPERT_IDS)[number];
export const EXPERT_LABELS: Record<ExpertId, string> = { pri: 'Pri', ze: 'Zé' };

export function isExpertId(value: unknown): value is ExpertId {
  return value === 'pri' || value === 'ze';
}

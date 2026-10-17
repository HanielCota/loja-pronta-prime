import { z } from 'zod';
import type { MetricObservation, MetricWindow } from './model';

export const GUIDANCE_ACTIONS = [
  'collect-period',
  'review-exposure',
  'review-offer',
  'keep-observing',
] as const;
export const GUIDANCE_COPY: Record<
  (typeof GUIDANCE_ACTIONS)[number],
  { title: string; description: string }
> = {
  'collect-period': {
    title: 'Complete o período de observação',
    description:
      'Solicite novas coletas para comparar o mesmo anúncio ao longo do tempo. Um contador acumulado sozinho não mostra o resultado de uma ação.',
  },
  'review-exposure': {
    title: 'Revise a exposição do produto',
    description:
      'O anúncio não recebeu novas visualizações registradas no intervalo. Confira se está ativo e revise as formas de apresentar o produto, usando as aulas do método.',
  },
  'review-offer': {
    title: 'Revise a apresentação e a oferta',
    description:
      'Houve novas visualizações e nenhuma nova venda registrada no intervalo. Confira fotos, descrição, preço e condições antes de aumentar o investimento.',
  },
  'keep-observing': {
    title: 'Acompanhe antes de ampliar',
    description:
      'Continue acompanhando os dados disponíveis. Confira o contexto e os custos antes de mudar produtos ou aumentar o investimento.',
  },
};
export const adviceSchema = z.object({
  priorities: z
    .array(
      z.object({
        action: z.enum(GUIDANCE_ACTIONS),
        itemId: z.number().int().positive().safe().nullable(),
      }),
    )
    .min(1)
    .max(3),
});
export type AdvicePriority = z.infer<typeof adviceSchema>['priorities'][number];

/** Os dados definem as opções permitidas. A IA apenas prioriza essas opções. */
export function guidanceCandidates(
  items: MetricObservation[],
  windows: MetricWindow[],
): AdvicePriority[] {
  if (!windows.length) return [{ action: 'collect-period', itemId: null }];
  const candidates: AdvicePriority[] = [];
  for (const item of items) {
    const window = windows.find((row) => row.itemId === item.itemId);
    if (!window || window.views === null) continue;
    if (window.views === 0) candidates.push({ action: 'review-exposure', itemId: item.itemId });
    else if (window.sales === 0) candidates.push({ action: 'review-offer', itemId: item.itemId });
  }
  return [...candidates.slice(0, 24), { action: 'keep-observing', itemId: null }];
}

export function validAdvice(priorities: AdvicePriority[], candidates: AdvicePriority[]) {
  const keys = priorities.map((row) => JSON.stringify([row.action, row.itemId]));
  return (
    priorities.length > 0 &&
    priorities.length <= 3 &&
    new Set(keys).size === keys.length &&
    priorities.every((row) =>
      candidates.some(
        (candidate) => candidate.action === row.action && candidate.itemId === row.itemId,
      ),
    )
  );
}

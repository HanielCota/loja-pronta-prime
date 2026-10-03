import { STORE_PHASES, STORE_STAGES } from '@/config/store-phases';
import type { ProductStatus } from '@/features/products/chooser';
import { stageNumber } from './stages';

/**
 * O cartão da Loja Pronta na escolha de área: a etapa (das 3 que ela vê no painel, a partir da
 * fase já mostrada, ver displayedPhase), o nome, a barra e o que acontece agora; e se a fase
 * depende dela (o cartão ganha o destaque).
 */
export function storeChooserCard(phase: number): {
  status: ProductStatus;
  waitsOnStudent: boolean;
} {
  const current = STORE_PHASES[phase - 1];
  const stage = stageNumber(phase);
  return {
    status: {
      caption: `Etapa ${stage} de ${STORE_STAGES.length}`,
      label: STORE_STAGES[stage - 1]?.title ?? '',
      bar: { step: stage, total: STORE_STAGES.length },
      detail: current?.detail,
    },
    waitsOnStudent: current?.needsStudent ?? false,
  };
}

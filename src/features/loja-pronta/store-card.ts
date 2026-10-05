import { STORE_PHASES, STORE_STAGES } from '@/config/store-phases';
import type { ProductStatus } from '@/features/products/chooser';
import { stageNumber } from './stages';

/** O que falta quando a marca foi confirmada antes do chat do logo (o logo antigo saiu). */
export const MISSING_LOGO_DETAIL = 'Falta o logo: crie no estúdio, escolhendo vendo.';

/**
 * O cartão da Loja Pronta na escolha de área: a etapa (das 3 que ela vê no painel, a partir da
 * fase já mostrada, ver displayedPhase), o nome, a barra e o que acontece agora; e se a fase
 * depende dela (o cartão ganha o destaque).
 *
 * `missingLogo`: marca confirmada sem logo. Em qualquer fase, o painel pede o logo; o cartão
 * também, senão a tela inicial diria "abre em breve" com algo esperando por ela.
 */
export function storeChooserCard(
  phase: number,
  { missingLogo = false }: { missingLogo?: boolean } = {},
): {
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
      detail: missingLogo ? MISSING_LOGO_DETAIL : current?.detail,
    },
    waitsOnStudent: missingLogo || (current?.needsStudent ?? false),
  };
}

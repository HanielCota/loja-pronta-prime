import { STORE_PHASES } from '@/config/store-phases';
import type { ProductStatus } from '@/features/products/chooser';

/**
 * O cartão da Loja Pronta na escolha de área: a fase (já a mostrada, ver displayedPhase), o nome,
 * a barra e o que acontece agora; e se a fase depende dela (o cartão ganha o destaque).
 */
export function storeChooserCard(phase: number): {
  status: ProductStatus;
  waitsOnStudent: boolean;
} {
  const current = STORE_PHASES[phase - 1];
  return {
    status: {
      caption: `Fase ${phase} de ${STORE_PHASES.length}`,
      label: current?.title ?? '',
      bar: { step: phase, total: STORE_PHASES.length },
      detail: current?.detail,
    },
    waitsOnStudent: current?.needsStudent ?? false,
  };
}

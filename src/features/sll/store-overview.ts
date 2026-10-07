import { STORE_PHASES } from '@/config/store-phases';
import { displayedPhase } from '@/features/loja-pronta/store-phase';

export type StoreAssemblyInput = {
  storeExists: boolean;
  onboardingExists: boolean;
  onboardingCompleted: boolean;
  brandExists: boolean;
  brandName: string | null;
  phase: number;
};

export type StoreAssembly = {
  name: string;
  phase: number;
  phaseTitle: string;
};

export type SllStoreOverview = {
  assembly: StoreAssembly | null;
  connected: {
    status: 'unavailable' | 'failure';
    reason: 'integration-preparation' | 'load-failure';
  };
};

export function failedSllStoreOverview(): SllStoreOverview {
  return {
    assembly: null,
    connected: { status: 'failure', reason: 'load-failure' },
  };
}

/**
 * O registro da Loja Pronta não é uma conexão Shopee. Mantemos os dois estados separados para
 * que a montagem nunca apareça na contagem de lojas conectadas.
 */
export function buildSllStoreOverview(
  input: StoreAssemblyInput,
  canAccessLojaPronta: boolean,
): SllStoreOverview {
  const hasAssembly =
    canAccessLojaPronta && (input.storeExists || input.onboardingExists || input.brandExists);

  return {
    assembly: hasAssembly
      ? {
          name: input.brandName?.trim() || 'Loja sem nome definido',
          phase: displayedPhase(input.phase, input.onboardingCompleted),
          phaseTitle:
            STORE_PHASES[displayedPhase(input.phase, input.onboardingCompleted) - 1]?.title ??
            'Processo em andamento',
        }
      : null,
    // A integração Shopee não tem fonte de dados no modelo atual; não transformar ausência em zero.
    connected: { status: 'unavailable', reason: 'integration-preparation' },
  };
}

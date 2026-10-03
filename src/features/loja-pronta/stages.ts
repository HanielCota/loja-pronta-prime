import { STORE_PHASES, STORE_STAGES } from '@/config/store-phases';

export type StageStatus = 'done' | 'current' | 'next';

export type StageView = {
  title: string;
  detail: string;
  status: StageStatus;
  /** Na etapa atual com várias fases: "Passo 1 de 5: Conta na Shopee". */
  step?: string | undefined;
  /**
   * Quanto da barra da etapa enche, de 0 a 1. Na atual com vários passos, até o meio do passo em
   * que ela está ("Passo 1 de 5" enche 10%); na atual sem passos, a metade.
   */
  fill: number;
};

/** Em que etapa (1 a 3) a fase está. */
export function stageNumber(phase: number): number {
  const index = STORE_STAGES.findIndex((stage) =>
    (stage.phases as readonly number[]).includes(phase),
  );
  return index === -1 ? 1 : index + 1;
}

/**
 * O caminho em 3 etapas, do jeito que a tela mostra: as feitas, a atual e as próximas. Com a loja
 * no ar (a última fase), tudo conta como feito.
 */
export function storeStages(phase: number): StageView[] {
  const live = phase >= STORE_PHASES.length;
  const current = stageNumber(phase);
  return STORE_STAGES.map((stage, index) => {
    const number = index + 1;
    const status: StageStatus =
      live || number < current ? 'done' : number === current ? 'current' : 'next';
    const phases = stage.phases as readonly number[];
    const position = phases.indexOf(phase);
    const step =
      status === 'current' && phases.length > 1 && position !== -1
        ? `Passo ${position + 1} de ${phases.length}: ${STORE_PHASES[phase - 1]?.title}`
        : undefined;
    const fill =
      status === 'done' ? 1 : status === 'next' ? 0 : step ? (position + 0.5) / phases.length : 0.5;
    return { title: stage.title, detail: stage.detail, status, step, fill };
  });
}

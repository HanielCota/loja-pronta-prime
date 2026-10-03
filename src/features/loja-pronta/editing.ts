/**
 * Fases feitas reabrem pra ela rever e mudar (a conversa, a marca) até a publicação: dali em
 * diante, a marca e as respostas já foram pra Shopee, e mudar aqui não mudaria a loja de verdade.
 */
export const EDITS_LOCKED_FROM_PHASE = 6;

export function canReviseDonePhases(storePhase: number): boolean {
  return storePhase < EDITS_LOCKED_FROM_PHASE;
}

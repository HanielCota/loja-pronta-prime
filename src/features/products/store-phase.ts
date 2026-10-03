/**
 * Fase que a aluna vê. Com a conversa inicial enviada e a loja ainda registrada na fase 1 (a
 * equipe pode ter voltado a loja, ou ainda não avançou), ela já está na fase 2: a conversa não
 * reabre, e mostrar "Conversa inicial · Agora" contradiria o "Estamos criando a sua marca".
 */
export function displayedPhase(storePhase: number, conversationSent: boolean): number {
  return storePhase === 1 && conversationSent ? 2 : storePhase;
}

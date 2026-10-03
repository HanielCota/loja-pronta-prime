/** Situação da conversa inicial, pro que a Loja Pronta mostra. */
export type ConversationStatus = 'nao-comecou' | 'em-andamento' | 'enviada';

export function conversationStatus({
  answers,
  completedAt,
}: {
  answers: object;
  completedAt: Date | null;
}): ConversationStatus {
  if (completedAt) return 'enviada';
  return Object.keys(answers).length > 0 ? 'em-andamento' : 'nao-comecou';
}

/**
 * Fase que a aluna vê. Com a conversa inicial enviada e a loja ainda registrada na fase 1 (a
 * equipe pode ter voltado a loja, ou ainda não avançou), ela já está na fase 2: a conversa não
 * reabre, e mostrar a conversa como fase atual contradiria o "Estamos criando sua marca".
 */
export function displayedPhase(storePhase: number, conversationSent: boolean): number {
  return storePhase === 1 && conversationSent ? 2 : storePhase;
}

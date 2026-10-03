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
 * Fase que a aluna vê, coerente com o que ela consegue fazer:
 * - conversa enviada com a loja ainda na fase 1: ela já está na fase 2 (a da marca);
 * - loja na fase 2 sem a conversa enviada (fase mudada no banco): ela ainda está na fase 1, porque
 *   a marca precisa das respostas da conversa. Sem isso, o painel mandaria criar a marca, a marca
 *   mandaria de volta pro painel, e ela ficaria presa.
 */
export function displayedPhase(storePhase: number, conversationSent: boolean): number {
  if (storePhase === 1 && conversationSent) return 2;
  if (storePhase === 2 && !conversationSent) return 1;
  return storePhase;
}

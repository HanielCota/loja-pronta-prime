import { conversationStatus, displayedPhase, type ConversationStatus } from '../store-phase';
import { getOnboarding } from './conversation';
import { getStorePhase } from './store';

export type StoreOverview = {
  /** A fase que ela vê (com a conversa enviada, a fase 1 já conta como 2). */
  phase: number;
  conversation: ConversationStatus;
};

/** Onde a loja está, do jeito que as telas mostram: a área da Loja Pronta e a escolha de área. */
export async function getStoreOverview(userId: string): Promise<StoreOverview> {
  const [storePhase, onboarding] = await Promise.all([
    getStorePhase(userId),
    getOnboarding(userId),
  ]);
  return {
    phase: displayedPhase(storePhase, Boolean(onboarding.completedAt)),
    conversation: conversationStatus(onboarding),
  };
}

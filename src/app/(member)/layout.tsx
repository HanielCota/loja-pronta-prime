import type { ReactNode } from 'react';
import { getSessionState } from '@/features/auth/server/session';
import { PresenceHeartbeat } from '@/features/presence/components/presence-heartbeat';
import { VisitBanner } from '@/features/support/components/visit-banner';

/**
 * As áreas das alunas avisam onde ela está, pro "Online agora" do admin. Quando alguém da equipe
 * entra na conta dela ("Entrar como aluna"), a faixa da visita fica no topo de toda página.
 */
export default async function MemberLayout({ children }: { children: ReactNode }) {
  const state = await getSessionState();
  const visit =
    state.status === 'active' && state.session.session.impersonatedBy
      ? {
          name: state.session.user.preferredName?.trim() || state.session.user.name,
          until: state.session.session.expiresAt,
        }
      : null;
  return (
    <>
      {visit ? <VisitBanner name={visit.name} until={visit.until} /> : null}
      {children}
      <PresenceHeartbeat />
    </>
  );
}

import type { ReactNode } from 'react';
import { getVisit } from '@/features/auth/server/session';
import { PresenceHeartbeat } from '@/features/presence/components/presence-heartbeat';
import { StaffVisitBanner } from '@/features/support/server/staff-visit-banner';

/**
 * As áreas das alunas avisam onde ela está, pro "Online agora" do admin. Quando alguém da equipe
 * entra na conta dela ("Entrar como aluna"), a faixa da visita fica no topo de toda página e a
 * presença não é enviada (a aluna não está ali).
 */
export default async function MemberLayout({ children }: { children: ReactNode }) {
  const visit = await getVisit();
  return (
    <>
      <StaffVisitBanner />
      {children}
      {visit ? null : <PresenceHeartbeat />}
    </>
  );
}

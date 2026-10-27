import type { ReactNode } from 'react';
import { getVisit } from '@/features/auth/server/session';
import { PresenceHeartbeat } from '@/features/presence/components/presence-heartbeat';
import { VisitBanner } from '@/features/support/components/visit-banner';
import { visitEndsAt } from '@/features/support/visit-window';

/**
 * As áreas das alunas avisam onde ela está, pro "Online agora" do admin. Quando alguém da equipe
 * entra na conta dela ("Entrar como aluna"), a faixa da visita fica no topo de toda página e a
 * presença não é enviada (a aluna não está ali).
 */
export default async function MemberLayout({ children }: { children: ReactNode }) {
  const visit = await getVisit();
  return (
    <>
      {visit ? <VisitBanner name={visit.studentName} until={visitEndsAt(visit.startedAt)} /> : null}
      {children}
      {visit ? null : <PresenceHeartbeat />}
    </>
  );
}

import type { ReactNode } from 'react';
import { PresenceHeartbeat } from '@/features/presence/components/presence-heartbeat';

/** As áreas das alunas avisam onde ela está, pro "Online agora" do admin. */
export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PresenceHeartbeat />
    </>
  );
}

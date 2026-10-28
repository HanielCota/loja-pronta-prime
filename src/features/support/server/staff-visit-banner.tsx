import { getVisit } from '@/features/auth/server/session';
import { visitEndsAt } from '../visit-window';
import { VisitBanner } from '../components/visit-banner';

/**
 * A faixa da visita ("Entrar como aluna") nas páginas da aluna: a área (`(member)/layout.tsx`) e
 * a escolha de áreas (`/` e `/menu`), que ficam fora dela. Sem visita, não desenha nada.
 */
export async function StaffVisitBanner() {
  const visit = await getVisit();
  if (!visit) return null;
  return <VisitBanner name={visit.studentName} until={visitEndsAt(visit.startedAt)} />;
}

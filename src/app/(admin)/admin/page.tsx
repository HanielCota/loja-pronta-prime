import { readClock } from '@/features/support/clock';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminRole } from '@/features/admin/access';
import { requireAdmin } from '@/features/admin/server/access';
import { readStaffFrameSession } from '@/features/support/server/staff-guard';
import { SupportNowCard } from '@/features/support-desk/components/support-now-card';
import { loadSupportNow } from '@/features/support-desk/server/queries';
import { loadSupportSchedule, isPaused } from '@/features/support/server/settings';
import { isWithinSupportHours } from '@/features/support/support-hours';
import { LearningContentTree } from '@/features/admin/components/learning-content-tree';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { AdminLiveOverview } from '@/features/admin/components/admin-live-overview';
import type { AdminSection } from '@/features/admin/components/admin-sidebar';
import { getOnlineStudents } from '@/features/admin/server/online';
import { getAdminOverview } from '@/features/admin/server/overview';
import {
  getAdminLearningContent,
  getArchivedLearningContent,
} from '@/features/admin/server/learning-content';

export const metadata: Metadata = {
  title: 'Painel administrativo',
};

/**
 * Sem `area`, a visão geral do painel (números e o que mudou por último). Com `area`, a estrutura
 * do conteúdo daquela área e o estado de publicação.
 */
export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  // Atendente e supervisor não veem o painel geral: entram direto nos chamados.
  const staff = await readStaffFrameSession();
  if (staff && !hasAdminRole(staff.user.role)) redirect('/admin/chamados');
  await requireAdmin();
  const { area } = await searchParams;
  if (area !== 'welcome' && area !== 'method' && area !== 'courses') {
    const [overview, { now, rows: online, total: onlineTotal }, supportNow, { settings, schedule }] = await Promise.all([
      getAdminOverview(),
      getOnlineStudents(),
      loadSupportNow(),
      loadSupportSchedule(),
    ]);
    const supportState = isPaused(settings)
      ? 'Em pausa'
      : isWithinSupportHours(readClock(), schedule)
        ? 'Aberto agora'
        : 'Fora do horário';
    return (
      <AdminPage title="Visão geral" intro="Os números da plataforma e o que mudou por último.">
        <SupportNowCard now={{ ...supportNow, state: supportState }} />
        <AdminLiveOverview initial={{ now, online, onlineTotal, overview }} />
      </AdminPage>
    );
  }
  const section: AdminSection = area;
  const [tracks, archived] = await Promise.all([
    getAdminLearningContent(),
    getArchivedLearningContent(),
  ]);

  const kind =
    section === 'welcome' ? 'welcome' : section === 'method' ? 'method' : 'complementary_course';
  const title =
    section === 'welcome'
      ? 'Comece aqui'
      : section === 'method'
        ? 'Método SLL'
        : 'Cursos complementares';
  return (
    <AdminPage
      title={title}
      intro="Abra um item para organizar as aulas. Edite ou arraste para mudar a ordem."
    >
      <section aria-label="Trilhas, etapas, módulos e aulas">
        {/* Uma árvore por área: sem a chave, o histórico de navegação da área anterior ficaria
            aberto e apontaria para itens que não existem nesta. */}
        <LearningContentTree
          key={kind}
          archived={archived}
          selectedKind={kind}
          tracks={tracks.filter((track) => track.kind === kind)}
        />
      </section>
    </AdminPage>
  );
}

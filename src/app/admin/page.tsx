import type { Metadata } from 'next';
import { requireAdmin } from '@/features/admin/server/access';
import { LearningContentTree } from '@/features/admin/components/learning-content-tree';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { AdminOverview } from '@/features/admin/components/admin-overview';
import { AutoRefresh } from '@/features/admin/components/auto-refresh';
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
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const session = await requireAdmin();
  const { area } = await searchParams;
  if (area !== 'welcome' && area !== 'method' && area !== 'courses') {
    const [overview, { now, rows: online }] = await Promise.all([
      getAdminOverview(),
      getOnlineStudents(),
    ]);
    return (
      <AdminShell
        account={session.user}
        current="overview"
        title="Visão geral"
        intro="Os números da plataforma e o que mudou por último."
      >
        {/* Mantém o "Online agora" e os números em dia sem recarregar. */}
        <AutoRefresh everyMs={30_000} />
        <AdminOverview now={now} online={online} overview={overview} />
      </AdminShell>
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
    <AdminShell
      account={session.user}
      current={section}
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
    </AdminShell>
  );
}

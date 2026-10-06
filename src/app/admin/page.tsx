import type { Metadata } from 'next';
import { AreaShell } from '@/features/member/components/area-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { LearningContentTree } from '@/features/admin/components/learning-content-tree';
import { AdminSidebar, type AdminSection } from '@/features/admin/components/admin-sidebar';
import {
  getAdminLearningContent,
  getArchivedLearningContent,
} from '@/features/admin/server/learning-content';

export const metadata: Metadata = {
  title: 'Painel administrativo',
};

/** Mostra a estrutura do conteúdo e o estado de publicação para administradoras. */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const session = await requireAdmin();
  const { area } = await searchParams;
  const section: AdminSection = area === 'method' || area === 'courses' ? area : 'welcome';
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
    <AreaShell
      account={session.user}
      hasChoice={false}
      sidebar={<AdminSidebar current={section} />}
      title={title}
      intro="Abra um item para organizar as aulas. Edite ou arraste para mudar a ordem."
    >
      <section aria-label="Trilhas, etapas, módulos e aulas">
        <LearningContentTree
          archived={archived}
          selectedKind={kind}
          tracks={tracks.filter((track) => track.kind === kind)}
        />
      </section>
    </AreaShell>
  );
}

import { getSllSidebarStages } from './server/catalog';
import { SllSidebarLinks } from './components/sll-sidebar-links';
import { getSllCopy } from './server/copy';

/**
 * Mantém os destinos da área de alunas na ordem do site antigo. `currentSection` marca a seção
 * de uma página que não está no menu (a aula marca a etapa ou a lista de onde ela veio).
 */
export async function SllSidebar({ currentSection }: { currentSection?: string | undefined }) {
  const [stages, copy] = await Promise.all([getSllSidebarStages(), getSllCopy()]);
  return (
    <SllSidebarLinks
      copy={copy}
      currentSection={currentSection}
      stages={stages.map((stage, index) => ({
        href: `/sll/metodo/etapa/${stage.id}`,
        label: `Etapa ${index + 1} — ${stage.title}`,
      }))}
    />
  );
}

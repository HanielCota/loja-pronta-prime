import { getSllSidebarStages } from './server/catalog';
import { SllSidebarLinks } from './components/sll-sidebar-links';
import { getSllCopy } from './server/copy';

/** Mantém os destinos da área de alunas na ordem do site antigo. */
export async function SllSidebar() {
  const [stages, copy] = await Promise.all([getSllSidebarStages(), getSllCopy()]);
  return (
    <SllSidebarLinks
      copy={copy}
      stages={stages.map((stage, index) => ({
        href: `/sll/metodo/etapa/${stage.id}`,
        label: `Etapa ${index + 1} — ${stage.title}`,
      }))}
    />
  );
}

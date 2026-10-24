import { getSllSidebarStages } from './server/catalog';
import { SllSidebarLinks } from './components/sll-sidebar-links';
import { getSllCopy } from './server/copy';

/**
 * Mantém os destinos da área de alunas na ordem do site antigo. Cada etapa leva as próprias
 * aulas, pra a aula (que não está no menu) marcar a etapa de onde veio. A moldura usa as duas
 * versões (`variant`); as buscas têm cache, então o banco é lido uma vez.
 */
export async function SllSidebar({ variant }: { variant: 'rail' | 'disclosure' }) {
  const [stages, copy] = await Promise.all([getSllSidebarStages(), getSllCopy()]);
  return (
    <SllSidebarLinks
      variant={variant}
      copy={copy}
      stages={stages.map((stage, index) => ({
        href: `/sll/metodo/etapa/${stage.id}`,
        label: `Etapa ${index + 1} — ${stage.title}`,
        lessonIds: stage.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
      }))}
    />
  );
}

import { getSllSidebarStages } from './server/catalog';
import { SllSidebarLinks } from './components/sll-sidebar-links';
import { getSllCopy } from './server/copy';
import Link from 'next/link';
import { requireProduct } from '@/features/products/server/access';
import { getStudentExperience } from './server/experience';

/**
 * Mantém os destinos da área de alunas na ordem do site antigo. Cada etapa leva as próprias
 * aulas, pra a aula (que não está no menu) marcar a etapa de onde veio. A moldura usa as duas
 * versões (`variant`); as buscas têm cache, então o banco é lido uma vez.
 */
export async function SllSidebar({ variant }: { variant: 'rail' | 'disclosure' }) {
  const { session } = await requireProduct('sll');
  const [stages, copy, experience] = await Promise.all([
    getSllSidebarStages(),
    getSllCopy(),
    getStudentExperience(session.user.id),
  ]);
  return (
    <>
      <SllSidebarLinks
        variant={variant}
        copy={copy}
        stages={stages.map((stage, index) => ({
          href: `/sll/metodo/etapa/${stage.id}`,
          label: `Etapa ${index + 1} — ${stage.title}`,
          lessonIds: stage.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
        }))}
      />
      {experience.allowed.includes('ze') ? (
        <Link
          href="/ze-mauro"
          className="mt-4 flex min-h-11 items-center rounded-2xl px-3 py-2 text-sm font-medium text-link focus-visible:outline-2 focus-visible:outline-ring"
        >
          Ir para o curso do Zé Mauro
        </Link>
      ) : null}
    </>
  );
}

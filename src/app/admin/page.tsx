import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaShell } from '@/features/member/components/area-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { LearningContentTree } from '@/features/admin/components/learning-content-tree';
import {
  getAdminLearningContent,
  getArchivedLearningContent,
} from '@/features/admin/server/learning-content';

export const metadata: Metadata = {
  title: 'Painel administrativo',
};

/** Mostra a estrutura do conteúdo e o estado de publicação para administradoras. */
export default async function AdminPage() {
  const session = await requireAdmin();
  const [tracks, archived] = await Promise.all([
    getAdminLearningContent(),
    getArchivedLearningContent(),
  ]);

  return (
    <AreaShell account={session.user} hasChoice={false} title="Conteúdo do SLL">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-body text-muted-foreground">Edite trilhas, etapas, cursos e aulas.</p>
        <Button asChild variant="soft">
          <Link href="/admin/banners">
            Editar banners do painel <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="soft">
          <Link href="/admin/recursos">
            Editar Recursos e Ferramentas <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="soft">
          <Link href="/admin/acessos">
            Gerenciar acessos <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <section aria-label="Trilhas, etapas, módulos e aulas">
        <LearningContentTree archived={archived} tracks={tracks} />
      </section>
    </AreaShell>
  );
}

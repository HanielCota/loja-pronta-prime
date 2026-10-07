import { RotateCcw } from 'lucide-react';
import type { Metadata } from 'next';
import { asc, isNotNull } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { ArchivedLearningContent } from '@/features/admin/components/structure-controls';
import { requireAdmin } from '@/features/admin/server/access';
import { getArchivedLearningContent } from '@/features/admin/server/learning-content';
import { restoreSllBannerForm, restoreSllResourceForm } from '@/features/admin/server/actions';
import { db } from '@/server/db';
import { learningBanners, learningResources } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Itens arquivados · Administração' };

export default async function ArchivedContentPage() {
  const [session, archived, banners, resources] = await Promise.all([
    requireAdmin(),
    getArchivedLearningContent(),
    db.query.learningBanners.findMany({
      columns: { id: true, title: true },
      where: isNotNull(learningBanners.archivedAt),
      orderBy: [asc(learningBanners.title)],
    }),
    db.query.learningResources.findMany({
      columns: { id: true, title: true },
      where: isNotNull(learningResources.archivedAt),
      orderBy: [asc(learningResources.title)],
    }),
  ]);
  return (
    <AdminShell
      account={session.user}
      current="archived"
      title="Itens arquivados"
      intro="O conteúdo fica guardado aqui. Restaure um item para voltar a editá-lo."
    >
      <div className="flex flex-col gap-6">
        <div className={panelCard}>
          <ArchivedLearningContent initiallyOpen items={archived} standalone />
        </div>
        <section aria-label="Banners arquivados" className={panelCard}>
          <h2 className="text-title font-semibold text-foreground">Banners</h2>
          {banners.length ? (
            <ul className="flex flex-col gap-3">
              {banners.map((banner) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4"
                  key={banner.id}
                >
                  <span className="text-body text-foreground">{banner.title}</span>
                  <form action={restoreSllBannerForm}>
                    <input name="id" type="hidden" value={banner.id} />
                    <Button size="inline" type="submit" variant="soft">
                      <RotateCcw aria-hidden="true" data-icon="inline-start" />
                      Restaurar como rascunho
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-muted-foreground">Nenhum banner arquivado.</p>
          )}
        </section>
        <section aria-label="Recursos arquivados" className={panelCard}>
          <h2 className="text-title font-semibold text-foreground">Recursos</h2>
          {resources.length ? (
            <ul className="flex flex-col gap-3">
              {resources.map((resource) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4"
                  key={resource.id}
                >
                  <span className="text-body text-foreground">{resource.title}</span>
                  <form action={restoreSllResourceForm}>
                    <input name="id" type="hidden" value={resource.id} />
                    <Button size="inline" type="submit" variant="soft">
                      <RotateCcw aria-hidden="true" data-icon="inline-start" />
                      Restaurar como rascunho
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-muted-foreground">Nenhum recurso arquivado.</p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

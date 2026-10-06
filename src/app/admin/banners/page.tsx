import type { Metadata } from 'next';
import { asc, eq, isNull } from 'drizzle-orm';
import { AreaShell } from '@/features/member/components/area-shell';
import { AdminSidebar } from '@/features/admin/components/admin-sidebar';
import { SllBannerList } from '@/features/admin/components/sll-banner-list';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import { learningBanners, learningNodeDrafts, learningNodeHistory } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Banners do SLL · Administração' };

export default async function AdminBannersPage() {
  const session = await requireAdmin();
  const [banners, drafts, history] = await Promise.all([
    db.query.learningBanners.findMany({
      columns: {
        id: true,
        label: true,
        title: true,
        description: true,
        buttonLabel: true,
        destination: true,
        imageAlt: true,
        imageStorageKey: true,
        position: true,
        status: true,
      },
      where: isNull(learningBanners.archivedAt),
      orderBy: [asc(learningBanners.position), asc(learningBanners.id)],
    }),
    db.query.learningNodeDrafts.findMany({ where: eq(learningNodeDrafts.kind, 'banner') }),
    db.query.learningNodeHistory.findMany({ where: eq(learningNodeHistory.kind, 'banner') }),
  ]);
  const draftsById = new Map(drafts.map((draft) => [draft.nodeId, draft.data]));
  const historyIds = new Set(history.map((item) => item.nodeId));

  return (
    <AreaShell
      account={session.user}
      hasChoice={false}
      sidebar={<AdminSidebar current="banners" />}
      title="Banners do painel"
      intro="Edite os avisos grandes que aparecem no início do SLL. Um banner precisa de imagem e publicação para aparecer às alunas."
    >
      <section aria-label="Banners em ordem">
        <SllBannerList
          key={banners.map((banner) => banner.id).join(':')}
          banners={banners.map((banner) => ({
            ...banner,
            draft: draftsById.get(banner.id) ?? null,
            hasHistory: historyIds.has(banner.id),
            hasImage: Boolean(draftsById.get(banner.id)?.imageStorageKey ?? banner.imageStorageKey),
          }))}
        />
      </section>
    </AreaShell>
  );
}

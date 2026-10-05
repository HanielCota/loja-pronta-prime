import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, isNull } from 'drizzle-orm';
import { AreaShell } from '@/features/member/components/area-shell';
import { SllBannerEditor } from '@/features/admin/components/sll-banner-editor';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import { learningBanners } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Banners do SLL · Administração' };

export default async function AdminBannersPage() {
  const session = await requireAdmin();
  const banners = await db.query.learningBanners.findMany({
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
  });

  return (
    <AreaShell account={session.user} hasChoice={false} title="Banners do painel">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <p className="flex-1 text-body text-muted-foreground">
          Edite os slides que aparecem no início do SLL. Um banner só aparece depois que tiver
          imagem e estiver marcado para exibição.
        </p>
        <Link
          className="inline-flex min-h-11 items-center text-body text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          href="/admin"
        >
          Voltar ao conteúdo do SLL
        </Link>
      </div>
      <section className="grid items-start gap-6 lg:grid-cols-2" aria-label="Banners em ordem">
        {banners.map((banner, index) => (
          <SllBannerEditor
            key={banner.id}
            banner={{ ...banner, hasImage: Boolean(banner.imageStorageKey) }}
            isLast={index === banners.length - 1}
          />
        ))}
        <SllBannerEditor />
      </section>
    </AreaShell>
  );
}

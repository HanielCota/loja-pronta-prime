import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, isNull } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { AreaShell } from '@/features/member/components/area-shell';
import { SllResourceEditor } from '@/features/admin/components/sll-resource-editor';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import { learningResources } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Recursos do SLL · Administração' };

export default async function AdminResourcesPage() {
  const session = await requireAdmin();
  const resources = await db.query.learningResources.findMany({
    columns: {
      id: true,
      groupKey: true,
      groupTitle: true,
      title: true,
      description: true,
      buttonLabel: true,
      destination: true,
      position: true,
      status: true,
    },
    where: isNull(learningResources.archivedAt),
    orderBy: [
      asc(learningResources.groupKey),
      asc(learningResources.position),
      asc(learningResources.id),
    ],
  });

  return (
    <AreaShell account={session.user} hasChoice={false} title="Recursos do SLL">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-body text-muted-foreground">
          Edite ferramentas, parceiros e links. Sem destino, a aluna verá “Em breve”.
        </p>
        <Button asChild variant="soft">
          <Link href="/admin">Voltar ao conteúdo do SLL</Link>
        </Button>
      </div>
      <section
        aria-label="Recursos que aparecem no SLL"
        className="grid items-start gap-6 lg:grid-cols-2"
      >
        {resources.map((resource, index) => (
          <SllResourceEditor
            isFirst={resources[index - 1]?.groupKey !== resource.groupKey}
            isLast={resources[index + 1]?.groupKey !== resource.groupKey}
            key={resource.id}
            resource={resource}
          />
        ))}
        <SllResourceEditor />
      </section>
    </AreaShell>
  );
}

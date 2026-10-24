import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { asc, eq, isNull } from 'drizzle-orm';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { SllResourceEditor } from '@/features/admin/components/sll-resource-editor';
import { SllResourceList } from '@/features/admin/components/sll-resource-list';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import {
  learningLessons,
  learningNodeDrafts,
  learningNodeHistory,
  learningResources,
} from '@/server/db/schema';

export const metadata: Metadata = { title: 'Recursos do SLL · Administração' };

function trackRank(kind: string) {
  return kind === 'welcome' ? 0 : kind === 'method' ? 1 : 2;
}

export default async function AdminResourcesPage() {
  await requireAdmin();
  const [resources, drafts, history, links, lessons] = await Promise.all([
    db.query.learningResources.findMany({
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
    }),
    db.query.learningNodeDrafts.findMany({
      where: eq(learningNodeDrafts.kind, 'resource'),
    }),
    db.query.learningNodeHistory.findMany({ where: eq(learningNodeHistory.kind, 'resource') }),
    db.query.learningResourceLessons.findMany(),
    db.query.learningLessons.findMany({
      columns: { id: true, title: true, position: true },
      where: isNull(learningLessons.archivedAt),
      with: {
        module: {
          columns: { title: true, position: true, archivedAt: true },
          with: {
            stage: {
              columns: { title: true, position: true, archivedAt: true },
              with: {
                track: {
                  columns: { id: true, kind: true, title: true, position: true, archivedAt: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  const byId = new Map(drafts.map((draft) => [draft.nodeId, draft.data]));
  const historyIds = new Set(history.map((item) => item.nodeId));
  const lessonOptions = lessons
    .filter(
      (lesson) =>
        !lesson.module.archivedAt &&
        !lesson.module.stage.archivedAt &&
        !lesson.module.stage.track.archivedAt,
    )
    .toSorted((a, b) => {
      const left = a.module.stage.track;
      const right = b.module.stage.track;
      return (
        trackRank(left.kind) - trackRank(right.kind) ||
        left.position - right.position ||
        a.module.stage.position - b.module.stage.position ||
        a.module.position - b.module.position ||
        a.position - b.position
      );
    })
    .map((lesson) => ({
      id: lesson.id,
      trackId: lesson.module.stage.track.id,
      trackTitle: lesson.module.stage.track.title,
      title: `${lesson.module.stage.title} · ${lesson.title}`,
    }));
  const editableResources = resources.map((resource) => ({
    ...resource,
    draft: byId.get(resource.id) ?? null,
    hasHistory: historyIds.has(resource.id),
    relatedLessonIds:
      byId.get(resource.id)?.relatedLessonIds ??
      links.filter((link) => link.resourceId === resource.id).map((link) => link.lessonId),
  }));
  const groups = editableResources.reduce<
    Array<{ key: string; title: string; items: typeof editableResources }>
  >((result, resource) => {
    const group = result.find((item) => item.key === resource.groupKey);
    if (group) {
      group.items.push(resource);
      return result;
    }
    result.push({ key: resource.groupKey, title: resource.groupTitle, items: [resource] });
    return result;
  }, []);

  return (
    <AdminPage title="Recursos do SLL">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-body text-muted-foreground">
          Edite ferramentas, parceiros e links. Sem destino, a aluna verá “Em breve”.
        </p>
      </div>
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <SllResourceList
            groupKey={group.key}
            groupTitle={group.title}
            key={group.key}
            resources={group.items}
            lessonOptions={lessonOptions}
          />
        ))}
        <section aria-label="Adicionar recurso" className="max-w-2xl">
          <details>
            <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-body font-semibold text-link outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Plus aria-hidden="true" className="size-5" />
              Adicionar recurso
            </summary>
            <div className="mt-4">
              {/* Novo a cada recurso criado (não a cada troca de ordem): o cartão limpa. */}
              <SllResourceEditor
                key={resources
                  .map((resource) => resource.id)
                  .toSorted()
                  .join(':')}
                lessonOptions={lessonOptions}
              />
            </div>
          </details>
        </section>
      </div>
    </AdminPage>
  );
}

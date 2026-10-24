import type { Metadata } from 'next';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { SllCopyEditor } from '@/features/admin/components/sll-copy-editor';
import { requireAdmin } from '@/features/admin/server/access';
import { getSllCopy } from '@/features/sll/server/copy';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Textos do SLL · Administração' };

export default async function AdminSllCopyPage() {
  const [, publishedCopy, drafts, history] = await Promise.all([
    requireAdmin(),
    getSllCopy(),
    db.query.learningTextDrafts.findMany(),
    db.query.learningTextHistory.findMany(),
  ]);
  const draftValues = Object.fromEntries(drafts.map((draft) => [draft.key, draft.value]));
  const copy = { ...publishedCopy, ...draftValues };
  return (
    <AdminPage title="Textos das páginas">
      <p className="text-body text-muted-foreground">
        Altere as frases que a aluna vê no painel, nos cursos, nos recursos e no menu. Salve cada
        grupo depois de editar.
      </p>
      <SllCopyEditor
        copy={copy}
        draftKeys={drafts.map((draft) => draft.key)}
        historyKeys={history.map((item) => item.key)}
      />
    </AdminPage>
  );
}

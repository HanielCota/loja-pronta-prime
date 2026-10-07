import type { Metadata } from 'next';
import { panelCard } from '@/features/member/components/area-shell';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { AutoRefresh } from '@/features/admin/components/auto-refresh';
import { PresenceTable } from '@/features/admin/components/presence-table';
import { requireAdmin } from '@/features/admin/server/access';
import { getOnlineStudents } from '@/features/admin/server/online';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Online agora · Administração' };

const REFRESH_MS = 15_000;

/** Quem está com uma área aberta agora e em que página. */
export default async function AdminOnlinePage() {
  const session = await requireAdmin('/admin/online');
  const { now, rows } = await getOnlineStudents();

  return (
    <AdminShell
      account={session.user}
      current="online"
      title="Online agora"
      intro="Quem está com a plataforma aberta e em que página. A lista se atualiza sozinha a cada 15 segundos."
    >
      <AutoRefresh everyMs={REFRESH_MS} />
      <section aria-labelledby="online-list" className={cn(panelCard, 'gap-5 !p-5 sm:!p-6')}>
        <h2 className="text-title font-semibold text-foreground" id="online-list">
          {rows.length === 1 ? '1 pessoa online' : `${rows.length} pessoas online`}
        </h2>
        {rows.length ? (
          <PresenceTable now={now} rows={rows} />
        ) : (
          <p className="text-body text-muted-foreground">
            Ninguém com a plataforma aberta agora. Quem abrir uma área aparece aqui em poucos
            segundos.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Conta como online quem está com a aba aberta e à vista nos últimos 90 segundos.
        </p>
      </section>
    </AdminShell>
  );
}

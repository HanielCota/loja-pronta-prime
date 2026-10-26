import type { Metadata } from 'next';
import { panelCard } from '@/features/member/components/area-shell';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { AutoRefresh } from '@/features/admin/components/auto-refresh';
import { PresenceTable } from '@/features/admin/components/presence-table';
import { requireAdmin } from '@/features/admin/server/access';
import { getOnlineStudents } from '@/features/admin/server/online';
import { cn } from '@/lib/utils';
import { canManagePresenceVisibility } from '@/features/admin/presence-visibility';
import { getHiddenPresenceAccounts } from '@/features/admin/server/presence-visibility';
import { PresenceVisibilityManager } from '@/features/admin/components/presence-visibility-manager';

export const metadata: Metadata = { title: 'Online agora · Administração' };

const REFRESH_MS = 15_000;

/** Quem está com uma área aberta agora e em que página. */
export default async function AdminOnlinePage({
  searchParams,
}: {
  searchParams: Promise<{ visibility?: string }>;
}) {
  const session = await requireAdmin('/admin/online');
  const owner = canManagePresenceVisibility(session.user);
  const [{ now, rows, total }, hiddenAccounts, params] = await Promise.all([
    getOnlineStudents(),
    owner ? getHiddenPresenceAccounts() : Promise.resolve([]),
    searchParams,
  ]);
  // "2 no celular · 1 no computador": quantas pessoas em cada tipo de aparelho.
  const byKind = (['mobile', 'tablet', 'desktop'] as const)
    .map((kind) => ({
      kind,
      count: rows.filter((row) => row.device?.kind === kind).length,
    }))
    .filter((item) => item.count > 0)
    .map(({ kind, count }) =>
      kind === 'mobile'
        ? `${count} no celular`
        : kind === 'tablet'
          ? `${count} no tablet`
          : `${count} no computador`,
    );

  return (
    <AdminPage
      title="Online agora"
      intro="Quem está com a plataforma aberta e em que página. A lista se atualiza sozinha a cada 15 segundos."
    >
      <AutoRefresh everyMs={REFRESH_MS} />
      <section aria-labelledby="online-list" className={cn(panelCard, 'gap-5 !p-5 sm:!p-6')}>
        <div>
          <h2 className="text-title font-semibold text-foreground" id="online-list">
            {total === 1 ? '1 pessoa online' : `${total} pessoas online`}
          </h2>
          {byKind.length ? (
            <p className="mt-1 text-body text-muted-foreground">{byKind.join(' · ')}</p>
          ) : null}
          {rows.length < total ? (
            <p className="mt-1 text-body text-muted-foreground">
              A lista mostra as {rows.length} pessoas com o aviso mais recente.
            </p>
          ) : null}
        </div>
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
      {owner ? (
        <PresenceVisibilityManager accounts={hiddenAccounts} result={params.visibility} />
      ) : null}
    </AdminPage>
  );
}

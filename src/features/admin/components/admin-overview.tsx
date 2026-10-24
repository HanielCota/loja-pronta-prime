import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Radio,
  BookOpen,
  KeyRound,
  ReceiptText,
  ShieldBan,
  Store,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import { productLabel } from '../account-labels';
import type { ProductId } from '@/config/products';
import { formatLastSeen } from '@/features/presence/presence';
import { AreaTag, PresencePlaceText, type PresenceRow } from './presence-table';

/** O que a visão geral mostra (lido em `server/overview.ts`). */
export type AdminOverviewData = {
  totals: {
    accounts: number;
    newThisWeek: number;
    blocked: number;
    sll: number;
    lojaPronta: number;
    activePurchases: number;
  };
  recentAccounts: { id: string; name: string; email: string; createdAt: Date }[];
  recentAccess: {
    id: string;
    name: string;
    product: ProductId;
    action: 'granted' | 'revoked';
    createdAt: Date;
  }[];
  recentHotmart: { id: string; event: string; buyerEmail: string; receivedAt: Date }[];
};

// Dia, mês e hora: nas listas curtas, o ano ocuparia o espaço do nome e do email.
// Fuso fixo: o mesmo texto no servidor (UTC) e no navegador, sempre na hora do Brasil.
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const numberFormat = new Intl.NumberFormat('pt-BR');

const rowLink =
  '-mx-3 flex min-h-11 items-center gap-3 rounded-2xl px-3 py-3 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150';

/** Um número do painel. O cartão inteiro leva à tela onde ele se detalha. */
function StatTile({
  href,
  label,
  value,
  hint,
  Icon,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  Icon: LucideIcon;
}) {
  return (
    <Link
      className={cn(
        panelCard,
        'gap-3 !p-5 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-[background-color,transform] motion-safe:duration-150 motion-safe:ease-fluid motion-safe:active:scale-[0.98]',
      )}
      href={href}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-link">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </span>
      <span className="text-title-lg font-semibold text-foreground tabular-nums">
        {numberFormat.format(value)}
      </span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </Link>
  );
}

/** Um cartão com uma lista curta e o link pra ver tudo. */
function RecentPanel({
  id,
  title,
  href,
  linkLabel,
  empty,
  children,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn(panelCard, 'min-w-0 gap-4 !p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body font-semibold text-foreground" id={id}>
          {title}
        </h2>
        <Link
          className="inline-flex min-h-11 items-center gap-1 text-body text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={href}
        >
          {linkLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {empty ? <p className="text-body text-muted-foreground">{empty}</p> : children}
    </section>
  );
}

const hotmartEventLabels: Record<string, string> = {
  PURCHASE_APPROVED: 'Compra aprovada',
  PURCHASE_COMPLETE: 'Compra concluída',
  PURCHASE_REFUNDED: 'Reembolso',
  PURCHASE_CHARGEBACK: 'Contestação',
  PURCHASE_CANCELED: 'Cancelamento',
};

export function AdminOverview({
  overview,
  online,
  onlineTotal,
  now,
}: {
  overview: AdminOverviewData;
  /** Quem está online agora (a lista completa fica em /admin/online). */
  online: PresenceRow[];
  /** Quantas pessoas estão online de verdade (a lista tem teto). */
  onlineTotal: number;
  now: Date;
}) {
  const { totals, recentAccounts, recentAccess, recentHotmart } = overview;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Números do painel">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <li className="grid">
            <StatTile
              hint="Todas as contas cadastradas"
              href="/admin/contas"
              Icon={UsersRound}
              label="Contas"
              value={totals.accounts}
            />
          </li>
          <li className="grid">
            <StatTile
              hint="Criadas nos últimos 7 dias"
              href="/admin/contas"
              Icon={UserPlus}
              label="Novas na semana"
              value={totals.newThisWeek}
            />
          </li>
          <li className="grid">
            <StatTile
              hint="Contas com acesso ao curso"
              href="/admin/acessos"
              Icon={BookOpen}
              label="Com o SLL"
              value={totals.sll}
            />
          </li>
          <li className="grid">
            <StatTile
              hint="Contas montando a loja"
              href="/admin/acessos"
              Icon={Store}
              label="Com a Loja Pronta"
              value={totals.lojaPronta}
            />
          </li>
          <li className="grid">
            <StatTile
              hint="Compras que dão acesso hoje"
              href="/admin/hotmart"
              Icon={ReceiptText}
              label="Compras ativas"
              value={totals.activePurchases}
            />
          </li>
          <li className="grid">
            <StatTile
              hint="Sem acesso à plataforma"
              href="/admin/contas"
              Icon={ShieldBan}
              label="Bloqueadas"
              value={totals.blocked}
            />
          </li>
        </ul>
      </section>

      <RecentPanel
        empty={online.length ? null : 'Ninguém com a plataforma aberta agora.'}
        href="/admin/online"
        id="online-now"
        linkLabel="Ver todas"
        title={`Online agora (${onlineTotal})`}
      >
        <ul className="grid gap-x-8 lg:grid-cols-2 [&>li]:border-b [&>li]:border-border">
          {online.slice(0, 6).map((row) => (
            <li key={row.userId}>
              <Link className={rowLink} href={`/admin/contas/${row.userId}`}>
                <Radio aria-hidden="true" className="size-5 shrink-0 text-progress-text" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium text-foreground">{row.name}</span>
                  <PresencePlaceText row={row} />
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <AreaTag area={row.area} />
                  <span className="text-sm text-muted-foreground">
                    {[row.device?.kindLabel, formatLastSeen(row.lastSeenAt, now)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </RecentPanel>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <RecentPanel
          empty={recentAccounts.length ? null : 'Nenhuma conta ainda.'}
          href="/admin/contas"
          id="recent-accounts"
          linkLabel="Ver contas"
          title="Contas novas"
        >
          <ul className="divide-y divide-border">
            {recentAccounts.map((account) => (
              <li key={account.id}>
                <Link className={rowLink} href={`/admin/contas/${account.id}`}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium text-foreground">
                      {account.name}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{account.email}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {dateFormat.format(account.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </RecentPanel>

        <RecentPanel
          empty={recentAccess.length ? null : 'Nenhuma alteração registrada ainda.'}
          href="/admin/acessos"
          id="recent-access"
          linkLabel="Ver histórico"
          title="Acessos alterados"
        >
          <ul className="divide-y divide-border">
            {recentAccess.map((event) => (
              <li className="flex items-center gap-3 py-3" key={event.id}>
                <KeyRound aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium text-foreground">
                    {event.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {event.action === 'granted' ? 'Liberou' : 'Removeu'}{' '}
                    {productLabel(event.product)}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {dateFormat.format(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </RecentPanel>

        <RecentPanel
          empty={recentHotmart.length ? null : 'Nenhum aviso da Hotmart recebido ainda.'}
          href="/admin/hotmart"
          id="recent-hotmart"
          linkLabel="Ver compras"
          title="Avisos da Hotmart"
        >
          <ul className="divide-y divide-border">
            {recentHotmart.map((event) => (
              <li className="flex items-center gap-3 py-3" key={event.id}>
                <ReceiptText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium text-foreground">
                    {hotmartEventLabels[event.event] ?? event.event}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">{event.buyerEmail}</span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {dateFormat.format(event.receivedAt)}
                </span>
              </li>
            ))}
          </ul>
        </RecentPanel>
      </div>
    </div>
  );
}

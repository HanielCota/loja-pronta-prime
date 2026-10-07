import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelCard } from '@/features/member/components/area-shell';
import { AdminShell } from '@/features/admin/components/admin-shell';
import {
  AccountBlockForm,
  AccountDetailsForm,
  AccountSessionsForm,
} from '@/features/admin/components/account-forms';
import { ProductAccessManager } from '@/features/admin/components/product-access-manager';
import { hasAdminRole } from '@/features/admin/access';
import { productLabel } from '@/features/admin/account-labels';
import { requireAdmin } from '@/features/admin/server/access';
import { getAccount } from '@/features/admin/server/accounts';
import { getLastPresence } from '@/features/admin/server/online';
import { formatLastSeen, isOnline } from '@/features/presence/presence';

export const metadata: Metadata = { title: 'Conta · Administração' };

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

/** Uma conta: cada coisa que dá pra mudar num cartão próprio, com o resumo ao lado. */
export default async function AdminAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/contas/${id}`);
  const [data, { now, presence }] = await Promise.all([getAccount(id), getLastPresence(id)]);
  if (!data) notFound();
  const lastSeen = presence
    ? `${isOnline(presence.lastSeenAt, now) ? 'Online agora' : formatLastSeen(presence.lastSeenAt, now)} · ${[
        presence.area,
        presence.page,
        presence.lessonTitle,
      ]
        .filter(Boolean)
        .join(' · ')}`
    : 'Ainda não abriu as áreas';
  const { account, products, storePhase, sessions } = data;
  // A própria conta não aparece com bloquear/desconectar: seria se trancar fora do painel.
  const isSelf = account.id === session.user.id;
  const status = account.banned
    ? `Bloqueada${account.banReason ? ` · ${account.banReason}` : ''}`
    : 'Ativa';

  return (
    <AdminShell
      account={session.user}
      current="accounts"
      backLink={{ href: '/admin/contas', label: 'Todas as contas' }}
      title={account.name}
      intro={account.email}
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="account-details" className={`${panelCard} gap-5`}>
            <h2 className="text-title font-semibold text-foreground" id="account-details">
              Dados da conta
            </h2>
            <AccountDetailsForm
              admin={hasAdminRole(account.role)}
              email={account.email}
              id={account.id}
              mustChangePassword={account.mustChangePassword ?? false}
              name={account.name}
              preferredName={account.preferredName}
            />
          </section>

          <section aria-labelledby="account-products" className={`${panelCard} gap-5`}>
            <div>
              <h2 className="text-title font-semibold text-foreground" id="account-products">
                Produtos
              </h2>
              <p className="mt-2 text-body text-muted-foreground">
                Cada alteração fica no histórico de Acessos das alunas.
              </p>
            </div>
            {/* Recomeça quando o email muda: o campo já preenchido não acompanharia sozinho. */}
            <ProductAccessManager email={account.email} key={account.email} />
          </section>
        </div>
        {/* No computador, o resumo e o acesso ficam ao lado, à vista enquanto edita. */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-10">
          <section aria-labelledby="account-summary" className={`${panelCard} gap-4`}>
            <h2 className="text-title font-semibold text-foreground" id="account-summary">
              Resumo
            </h2>
            <dl className="grid gap-x-6 gap-y-2 text-body sm:grid-cols-[auto_1fr] xl:grid-cols-1">
              <dt className="text-muted-foreground">Situação</dt>
              <dd className="mb-2 text-foreground sm:mb-0 xl:mb-2">{status}</dd>
              <dt className="text-muted-foreground">Último acesso</dt>
              <dd className="mb-2 text-foreground sm:mb-0 xl:mb-2">{lastSeen}</dd>
              <dt className="text-muted-foreground">Função</dt>
              <dd className="mb-2 text-foreground sm:mb-0 xl:mb-2">
                {hasAdminRole(account.role) ? 'Admin' : 'Aluna'}
              </dd>
              <dt className="text-muted-foreground">Produtos</dt>
              <dd className="mb-2 text-foreground sm:mb-0 xl:mb-2">
                {products.length
                  ? products
                      .map(
                        (item) =>
                          `${productLabel(item.product)} (desde ${dateFormat.format(item.grantedAt)})`,
                      )
                      .join(', ')
                  : 'Nenhum'}
              </dd>
              <dt className="text-muted-foreground">Fase da loja</dt>
              <dd className="mb-2 text-foreground sm:mb-0 xl:mb-2">
                {storePhase ? `${storePhase} de 7` : 'Ainda não começou'}
              </dd>
              <dt className="text-muted-foreground">Sessões abertas</dt>
              <dd className="mb-2 text-foreground sm:mb-0 xl:mb-2">{sessions}</dd>
              <dt className="text-muted-foreground">Criada em</dt>
              <dd className="text-foreground">{dateFormat.format(account.createdAt)}</dd>
            </dl>
          </section>

          {isSelf ? null : (
            <section aria-labelledby="account-security" className={`${panelCard} gap-5`}>
              <div>
                <h2 className="text-title font-semibold text-foreground" id="account-security">
                  Acesso à plataforma
                </h2>
                <p className="mt-2 text-body text-muted-foreground">
                  Bloquear desconecta a conta e impede que ela entre de novo até ser desbloqueada.
                </p>
              </div>
              <AccountSessionsForm id={account.id} />
              <AccountBlockForm blocked={account.banned ?? false} id={account.id} />
            </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { AdminSidebar } from '@/features/admin/components/admin-sidebar';
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

export const metadata: Metadata = { title: 'Conta · Administração' };

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

/** Uma conta: o resumo e, embaixo, cada coisa que dá pra mudar num cartão próprio. */
export default async function AdminAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/contas/${id}`);
  const data = await getAccount(id);
  if (!data) notFound();
  const { account, products, storePhase, sessions } = data;
  // A própria conta não aparece com bloquear/desconectar: seria se trancar fora do painel.
  const isSelf = account.id === session.user.id;
  const status = account.banned
    ? `Bloqueada${account.banReason ? ` · ${account.banReason}` : ''}`
    : 'Ativa';

  return (
    <AreaShell
      account={session.user}
      hasChoice={false}
      sidebar={<AdminSidebar current="accounts" />}
      beforeHeader={
        <Link
          className="inline-flex min-h-11 items-center gap-1 self-start text-body text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/admin/contas"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          Todas as contas
        </Link>
      }
      title={account.name}
      intro={account.email}
    >
      <div className="flex flex-col gap-6">
        <section aria-labelledby="account-summary" className={`${panelCard} gap-4`}>
          <h2 className="text-title font-semibold text-foreground" id="account-summary">
            Resumo
          </h2>
          <dl className="grid gap-x-6 gap-y-2 text-body sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Situação</dt>
            <dd className="mb-2 text-foreground sm:mb-0">{status}</dd>
            <dt className="text-muted-foreground">Função</dt>
            <dd className="mb-2 text-foreground sm:mb-0">
              {hasAdminRole(account.role) ? 'Admin' : 'Aluna'}
            </dd>
            <dt className="text-muted-foreground">Produtos</dt>
            <dd className="mb-2 text-foreground sm:mb-0">
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
            <dd className="mb-2 text-foreground sm:mb-0">
              {storePhase ? `${storePhase} de 7` : 'Ainda não começou'}
            </dd>
            <dt className="text-muted-foreground">Sessões abertas</dt>
            <dd className="mb-2 text-foreground sm:mb-0">{sessions}</dd>
            <dt className="text-muted-foreground">Criada em</dt>
            <dd className="text-foreground">{dateFormat.format(account.createdAt)}</dd>
          </dl>
        </section>
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
          <ProductAccessManager key={account.email} email={account.email} />
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
    </AreaShell>
  );
}

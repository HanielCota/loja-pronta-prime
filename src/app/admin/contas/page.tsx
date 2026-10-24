import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Search, UserPlus } from 'lucide-react';
import { panelCard } from '@/features/member/components/area-shell';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { hasAdminRole } from '@/features/admin/access';
import { productLabel } from '@/features/admin/account-labels';
import { requireAdmin } from '@/features/admin/server/access';
import { ACCOUNTS_PAGE_SIZE, listAccounts } from '@/features/admin/server/accounts';
import { RowCellLink } from '@/features/admin/components/row-cell-link';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Contas · Administração' };

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

const pageLinkClass =
  'inline-flex min-h-11 items-center text-body text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Etiqueta da tabela. O texto diz o estado; a cor só reforça. */
function Tag({ tone, children }: { tone: 'product' | 'neutral' | 'danger'; children: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium whitespace-nowrap forced-colors:border forced-colors:border-[CanvasText]',
        tone === 'product' && 'bg-primary-soft text-link',
        tone === 'neutral' && 'bg-muted text-foreground',
        tone === 'danger' && 'bg-destructive-soft text-destructive',
      )}
    >
      {children}
    </span>
  );
}

/** Todas as contas, com busca por nome ou email (formulário GET: funciona sem JavaScript). */
export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const session = await requireAdmin('/admin/contas');
  const { q = '', pagina } = await searchParams;
  const page = Math.max(1, Number.parseInt(pagina ?? '1', 10) || 1);
  const { accounts, total } = await listAccounts({ query: q, page });
  const pages = Math.max(1, Math.ceil(total / ACCOUNTS_PAGE_SIZE));
  const pageHref = (target: number) =>
    `/admin/contas?${new URLSearchParams({ ...(q ? { q } : {}), pagina: String(target) })}`;
  const count = `${total} ${q ? 'encontrada' : 'conta'}${total === 1 ? '' : 's'}`;
  const rows = accounts.map((account) => ({
    ...account,
    href: `/admin/contas/${account.id}`,
    admin: hasAdminRole(account.role),
  }));

  return (
    <AdminShell
      account={session.user}
      current="accounts"
      title="Contas"
      intro="Abra uma conta para editar os dados, liberar produtos ou bloquear o acesso."
      actions={
        <Button asChild className="sm:w-auto">
          <Link href="/admin/contas/nova">
            <UserPlus aria-hidden="true" />
            Criar conta
          </Link>
        </Button>
      }
    >
      <section aria-labelledby="accounts-list" className={cn(panelCard, 'gap-5 !p-5 sm:!p-6')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-title font-semibold text-foreground" id="accounts-list">
            {count}
          </h2>
          <search className="lg:w-[28rem]">
            <form action="/admin/contas" className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <FloatingLabelInput
                  defaultValue={q}
                  id="accounts-search"
                  label="Buscar por nome ou email"
                  name="q"
                  type="search"
                />
              </div>
              <Button className="sm:w-auto" type="submit" variant="soft">
                <Search aria-hidden="true" />
                Buscar
              </Button>
            </form>
          </search>
        </div>

        {rows.length ? (
          <>
            {/* Computador: tabela. A linha toda abre a conta (cada célula tem o link dela). */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-body tabular-nums">
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th className="py-3 pr-4 font-semibold" scope="col">
                      Nome
                    </th>
                    <th className="py-3 pr-4 font-semibold" scope="col">
                      Produtos
                    </th>
                    <th className="py-3 pr-4 font-semibold" scope="col">
                      Situação
                    </th>
                    <th className="py-3 pr-4 font-semibold whitespace-nowrap" scope="col">
                      Criada em
                    </th>
                    <th className="py-3" scope="col">
                      <span className="sr-only">Abrir</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((account) => (
                    <tr
                      className="hover:bg-muted has-[a:focus-visible]:bg-muted motion-safe:transition-colors motion-safe:duration-150"
                      key={account.id}
                    >
                      <td className="relative max-w-0 py-3 pr-4 pl-3 lg:w-[40%]">
                        <Link
                          className="block truncate font-semibold text-foreground outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                          href={account.href}
                        >
                          {account.name}
                        </Link>
                        <span className="block truncate text-sm text-muted-foreground">
                          {account.email}
                        </span>
                      </td>
                      <td className="relative py-3 pr-4">
                        <span className="flex flex-wrap gap-1.5">
                          {account.products.length ? (
                            account.products.map((product) => (
                              <Tag key={product} tone="product">
                                {productLabel(product)}
                              </Tag>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Nenhum</span>
                          )}
                        </span>
                        <RowCellLink href={account.href} />
                      </td>
                      <td className="relative py-3 pr-4">
                        <span className="flex flex-wrap gap-1.5">
                          {account.banned ? (
                            <Tag tone="danger">Bloqueada</Tag>
                          ) : (
                            <Tag tone="neutral">Ativa</Tag>
                          )}
                          {account.admin ? <Tag tone="neutral">Admin</Tag> : null}
                        </span>
                        <RowCellLink href={account.href} />
                      </td>
                      <td className="relative py-3 pr-4 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                        {dateFormat.format(account.createdAt)}
                        <RowCellLink href={account.href} />
                      </td>
                      <td className="relative py-3 pr-3 text-right">
                        <ChevronRight
                          aria-hidden="true"
                          className="inline size-5 text-muted-foreground"
                        />
                        <RowCellLink href={account.href} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular: a mesma informação em lista, sem rolar pro lado. */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((account) => (
                <li key={account.id}>
                  <Link
                    className="-mx-3 flex min-h-11 items-center gap-3 rounded-2xl px-3 py-4 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    href={account.href}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-body font-semibold text-foreground">
                        {account.name}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {account.email}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {account.products.map((product) => (
                          <Tag key={product} tone="product">
                            {productLabel(product)}
                          </Tag>
                        ))}
                        {account.banned ? <Tag tone="danger">Bloqueada</Tag> : null}
                        {account.admin ? <Tag tone="neutral">Admin</Tag> : null}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma conta encontrada.</p>
        )}

        {pages > 1 ? (
          <nav
            aria-label="Páginas"
            className="flex items-center justify-between gap-4 border-t border-border pt-4"
          >
            {page > 1 ? (
              <Link className={pageLinkClass} href={pageHref(page - 1)}>
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <p className="text-body text-muted-foreground">
              Página {page} de {pages}
            </p>
            {page < pages ? (
              <Link className={pageLinkClass} href={pageHref(page + 1)}>
                Próxima
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </AdminShell>
  );
}

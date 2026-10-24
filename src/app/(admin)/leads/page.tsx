import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Archive,
  CalendarClock,
  ChevronRight,
  Download,
  Search,
  Upload,
  UserPlus,
  UsersRound,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { AdminSelect } from '@/features/admin/components/admin-select';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { LeadBadge } from '@/features/leads/components/lead-badge';
import { leadOptions, leadOverview, listLeads } from '@/features/leads/server/queries';
import {
  LEAD_PRODUCTS,
  LEAD_STAGES,
  interestLabels,
  parseLeadFilters,
  stageLabels,
  todayInBrazil,
} from '@/features/leads/model';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Contatos', robots: { index: false, follow: false } };
const linkClass =
  'inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-body text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin('/leads');
  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) => {
      const item = getParam(value);
      return item ? [[key, item]] : [];
    }),
  );
  const filters = parseLeadFilters(params);
  const [list, overview, options] = await Promise.all([
    listLeads(filters),
    leadOverview(),
    leadOptions(),
  ]);
  const today = todayInBrazil();
  const href = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete('pagina');
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `/leads?${next}`;
  };
  const metrics = [
    {
      label: 'Contatos cadastrados',
      value: overview.total,
      hint: 'Sem os arquivados',
      Icon: UsersRound,
      href: '/leads',
    },
    {
      label: 'Retornos até hoje',
      value: overview.due,
      hint: 'Hoje e dias anteriores',
      Icon: CalendarClock,
      href: '/leads?retornos=hoje',
    },
    {
      label: 'Vendas concluídas',
      value: overview.won,
      hint: 'Marcadas no painel',
      Icon: CheckCircle2,
      href: '/leads?etapa=won',
    },
    {
      label: 'Conversão',
      value: overview.conversion === null ? '—' : `${overview.conversion}%`,
      hint: 'Vendas ÷ contatos encerrados',
      Icon: Percent,
      href: '/leads?etapa=lost',
    },
  ];
  return (
    <AdminPage
      title="Contatos"
      intro="Acompanhe os contatos e saiba com quem falar a seguir."
      actions={
        <Button asChild className="sm:w-auto">
          <Link href="/leads/novo">
            <UserPlus aria-hidden="true" />
            Novo contato
          </Link>
        </Button>
      }
    >
      <section
        aria-label="Resumo dos contatos ativos"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, hint, Icon, href: target }) => (
          <Link
            key={label}
            href={target}
            className={cn(
              panelCard,
              'gap-3 !p-5 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-body font-semibold">{label}</span>
              <Icon className="size-5 shrink-0 text-link" aria-hidden="true" />
            </div>
            <span className="text-title-lg font-semibold tabular-nums">{value}</span>
            <span className="text-sm text-muted-foreground">{hint}</span>
          </Link>
        ))}
      </section>
      <section aria-labelledby="lead-stages" className={cn(panelCard, 'gap-4 !p-5 sm:!p-6')}>
        <h2 id="lead-stages" className="text-body font-semibold">
          Etapas de venda
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {LEAD_STAGES.map((stage) => (
            <li key={stage}>
              <Link
                href={href({ etapa: stage, arquivados: '', retornos: '' })}
                aria-current={filters.stage === stage && !filters.archived ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-body outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  filters.stage === stage && !filters.archived
                    ? 'bg-primary-soft text-link'
                    : 'bg-muted text-foreground',
                )}
              >
                <span>{stageLabels[stage]}</span>
                <span className="font-semibold tabular-nums">{overview.counts[stage] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="lead-list" className={cn(panelCard, 'gap-5 !p-5 sm:!p-6')}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h2 id="lead-list" className="text-title font-semibold">
            {filters.archived
              ? 'Contatos arquivados'
              : filters.due
                ? 'Retornos até hoje'
                : 'Seus contatos'}{' '}
            <span className="text-muted-foreground">({list.total})</span>
          </h2>
          <div className="flex flex-wrap gap-x-3">
            <Link className={linkClass} href="/leads/importar">
              <Upload aria-hidden="true" className="size-5" />
              Importar CSV
            </Link>
            <a className={linkClass} href={`/leads/exportar?${params}`}>
              <Download aria-hidden="true" className="size-5" />
              Exportar CSV
            </a>
            <Link
              className={linkClass}
              href={href({ arquivados: filters.archived ? '' : 'sim', retornos: '' })}
            >
              <Archive aria-hidden="true" className="size-5" />
              {filters.archived ? 'Ver ativos' : 'Arquivados'}
            </Link>
          </div>
        </div>
        <search>
          <form action="/leads" className="flex flex-col gap-4">
            {filters.archived ? <input type="hidden" name="arquivados" value="sim" /> : null}
            <FloatingLabelInput
              id="lead-search"
              label="Buscar nome, email, WhatsApp ou etiqueta"
              name="q"
              type="search"
              defaultValue={filters.q}
              maxLength={120}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-stage">Etapa</Label>
                <AdminSelect id="filter-stage" name="etapa" defaultValue={filters.stage}>
                  <option value="">Todas as etapas</option>
                  {LEAD_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stageLabels[stage]}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-product">Produto</Label>
                <AdminSelect id="filter-product" name="produto" defaultValue={filters.product}>
                  <option value="">Todos os produtos</option>
                  {LEAD_PRODUCTS.map((product) => (
                    <option key={product} value={product}>
                      {interestLabels[product]}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-source">Origem</Label>
                <AdminSelect id="filter-source" name="origem" defaultValue={filters.source}>
                  <option value="">Todas as origens</option>
                  {options.sources.map(({ source }) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter-owner">Responsável</Label>
                <AdminSelect id="filter-owner" name="responsavel" defaultValue={filters.owner}>
                  <option value="">Todas as pessoas</option>
                  <option value="unassigned">Sem responsável</option>
                  {options.owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </AdminSelect>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
                <input type="checkbox" name="retornos" value="hoje" defaultChecked={filters.due} />
                Só retornos até hoje
              </label>
              <Button type="submit" variant="soft" size="inline" className="px-5">
                <Search aria-hidden="true" />
                Filtrar
              </Button>
              <Link
                className={linkClass}
                href={filters.archived ? '/leads?arquivados=sim' : '/leads'}
              >
                Limpar filtros
              </Link>
            </div>
          </form>
        </search>
        {list.rows.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-body">
                <caption className="sr-only">Contatos encontrados e próximos retornos</caption>
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    {['Contato', 'Etapa e produto', 'Origem e responsável', 'Próximo contato'].map(
                      (label) => (
                        <th key={label} scope="col" className="px-3 py-3 font-semibold">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map(({ lead, ownerName }) => (
                    <tr
                      key={lead.id}
                      className="border-b border-border last:border-0 hover:bg-muted"
                    >
                      <td className="max-w-72 px-3 py-4">
                        <Link
                          className={cn(linkClass, 'font-semibold break-words')}
                          href={`/leads/${lead.id}`}
                        >
                          {lead.name}
                          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
                        </Link>
                        <span className="block text-sm break-words text-muted-foreground">
                          {lead.email || lead.phone}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <LeadBadge stage={lead.stage} />
                        <span className="mt-2 block text-sm text-muted-foreground">
                          {interestLabels[lead.product]}
                        </span>
                      </td>
                      <td className="max-w-60 px-3 py-4">
                        <span className="block break-words">{lead.source}</span>
                        <span className="block text-sm break-words text-muted-foreground">
                          {ownerName || 'Sem responsável'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span
                          className={
                            lead.nextContact &&
                            lead.nextContact <= today &&
                            !['won', 'lost'].includes(lead.stage)
                              ? 'font-semibold text-link'
                              : 'text-muted-foreground'
                          }
                        >
                          {lead.nextContact
                            ? lead.nextContact.split('-').toReversed().join('/')
                            : 'Sem retorno marcado'}
                        </span>
                        {lead.nextContact &&
                        lead.nextContact < today &&
                        !['won', 'lost'].includes(lead.stage) ? (
                          <span className="block text-muted-foreground">Em atraso</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {list.rows.map(({ lead, ownerName }) => (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex min-h-11 flex-col gap-2 rounded-2xl px-2 py-4 text-body outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold break-words">
                      {lead.name}
                      <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                    </span>
                    <span className="text-sm break-words text-muted-foreground">
                      {lead.email || lead.phone}
                    </span>
                    <LeadBadge stage={lead.stage} />
                    <span className="text-sm text-muted-foreground">
                      {interestLabels[lead.product]} · {lead.source}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {ownerName || 'Sem responsável'} ·{' '}
                      {lead.nextContact
                        ? `Retorno: ${lead.nextContact.split('-').toReversed().join('/')}${lead.nextContact < today ? ' (em atraso)' : ''}`
                        : 'Sem retorno marcado'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <UsersRound aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="text-body font-semibold">Nenhum contato encontrado</p>
            <p className="max-w-[45ch] text-body text-pretty text-muted-foreground">
              {overview.total
                ? 'Ajuste os filtros para encontrar outros contatos.'
                : 'Cadastre o primeiro contato ou importe sua planilha para começar.'}
            </p>
          </div>
        )}
        {list.pages > 1 ? (
          <nav
            aria-label="Páginas de contatos"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
          >
            {list.page > 1 ? (
              <Link className={linkClass} href={href({ pagina: String(list.page - 1) })}>
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <p className="text-body text-muted-foreground">
              Página {list.page} de {list.pages}
            </p>
            {list.page < list.pages ? (
              <Link className={linkClass} href={href({ pagina: String(list.page + 1) })}>
                Próxima
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </AdminPage>
  );
}

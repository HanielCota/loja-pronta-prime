'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Archive,
  BookOpen,
  ChevronDown,
  FileText,
  Images,
  KeyRound,
  LayoutDashboard,
  LibraryBig,
  PanelLeft,
  Radio,
  ReceiptText,
  Rocket,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnlineCountBadge } from './online-count-badge';
import { RememberedGroup } from './remembered-group';
import { adminSectionFor, type AdminSection } from '../admin-section';

export type { AdminSection } from '../admin-section';

const groups = [
  {
    label: 'Painel',
    links: [
      { href: '/admin', label: 'Visão geral', section: 'overview', Icon: LayoutDashboard },
      { href: '/admin/online', label: 'Online agora', section: 'online', Icon: Radio },
    ],
  },
  {
    label: 'Alunas e vendas',
    links: [
      { href: '/admin/contas', label: 'Contas', section: 'accounts', Icon: UsersRound },
      { href: '/admin/acessos', label: 'Acessos das alunas', section: 'access', Icon: KeyRound },
      { href: '/leads', label: 'Contatos', section: 'leads', Icon: UsersRound },
      {
        href: '/admin/hotmart',
        label: 'Compras da Hotmart',
        section: 'hotmart',
        Icon: ReceiptText,
      },
    ],
  },
  {
    label: 'Conteúdo das alunas',
    // Secondary sections remember their state and open when their current page is active.
    collapsible: true,
    storageKey: 'admin-menu-content',
    links: [
      { href: '/admin?area=welcome', label: 'Comece aqui', section: 'welcome', Icon: Rocket },
      { href: '/admin?area=method', label: 'Método SLL', section: 'method', Icon: BookOpen },
      {
        href: '/admin?area=courses',
        // Curto no menu, pra caber numa linha; o título da página continua completo.
        label: 'Cursos',
        section: 'courses',
        Icon: LibraryBig,
      },
      {
        href: '/admin/experts',
        label: 'Especialistas e vídeos',
        section: 'experts',
        Icon: UsersRound,
      },
      { href: '/admin/banners', label: 'Banners do painel', section: 'banners', Icon: Images },
      { href: '/admin/textos', label: 'Textos das páginas', section: 'texts', Icon: FileText },
      { href: '/admin/recursos', label: 'Recursos', section: 'resources', Icon: Wrench },
      // Ícone próprio: o de livros já é dos cursos.
      { href: '/admin/arquivados', label: 'Itens arquivados', section: 'archived', Icon: Archive },
    ],
  },
  {
    label: 'Operação',
    collapsible: true,
    storageKey: 'admin-menu-operations',
    links: [
      { href: '/admin/assistente', label: 'Planos e operação', section: 'assistant', Icon: Wrench },
      { href: '/admin/bling', label: 'Conexão Bling', section: 'bling', Icon: Wrench },
      { href: '/admin/suporte', label: 'Suporte', section: 'support', Icon: UsersRound },
    ],
  },
] as const;

function NavLinks({
  links,
  current,
}: {
  links: (typeof groups)[number]['links'];
  current: AdminSection | undefined;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {links.map(({ href, label, section, Icon }) => (
        <li key={href}>
          <Link
            aria-current={current === section ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150',
              current === section
                ? 'bg-primary-soft font-semibold text-link hover:bg-primary/15'
                : 'hover:bg-muted',
            )}
            href={href}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            {label}
            {/* Quantas pessoas estão online, atualizado sozinho. */}
            {section === 'online' ? <OnlineCountBadge /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Navigation({ current }: { current: AdminSection | undefined }) {
  return (
    <nav aria-label="Seções da administração" className="flex flex-col gap-4">
      {groups.map((group) =>
        'collapsible' in group ? (
          <RememberedGroup
            containsCurrent={group.links.some((link) => link.section === current)}
            // Recomeça a cada seção, como quando cada página montava o menu: abre o grupo da
            // seção nova e volta à escolha guardada, sem gravar o fechamento como escolha dela.
            key={`${group.label}-${current ?? ''}`}
            label={group.label}
            storageKey={group.storageKey}
          >
            <NavLinks current={current} links={group.links} />
          </RememberedGroup>
        ) : (
          <div key={group.label}>
            <p className="mb-2 px-3 text-sm font-semibold text-muted-foreground">{group.label}</p>
            <NavLinks current={current} links={group.links} />
          </div>
        ),
      )}
    </nav>
  );
}

/**
 * As seções do painel. `rail`: a lista do menu lateral fixo (computador). `disclosure`: o mesmo
 * conteúdo recolhível acima do título (celular e tablet).
 */
export function AdminSidebar({ variant }: { variant: 'rail' | 'disclosure' }) {
  // A seção sai do endereço: a moldura mora no `layout.tsx`, e o menu acompanha a troca na hora.
  const current = adminSectionFor(usePathname(), useSearchParams().get('area'));
  if (variant === 'rail') return <Navigation current={current} />;
  const currentLabel = groups
    .map((group) => group.links.find((link) => link.section === current)?.label)
    .find((label) => label !== undefined);
  return (
    <details
      key={current}
      className="group/sections rounded-card bg-card p-4 shadow-card forced-colors:border forced-colors:border-[CanvasText]"
    >
      <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-semibold text-foreground outline-none hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150">
        {/* Abre a lista de seções (a do lado esquerdo no computador). */}
        <PanelLeft aria-hidden="true" className="size-5 text-link" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          Seções do painel
          {currentLabel ? (
            <span className="text-sm font-normal text-muted-foreground">{currentLabel}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-5 shrink-0 text-muted-foreground group-open/sections:rotate-180 motion-safe:transition-transform motion-safe:duration-150"
        />
      </summary>
      <div className="mt-4 border-t border-border pt-4">
        <Navigation current={current} />
      </div>
    </details>
  );
}

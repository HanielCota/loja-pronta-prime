'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Archive,
  BarChart3,
  BookOpen,
  ChevronDown,
  FileText,
  History,
  Images,
  KeyRound,
  LayoutDashboard,
  LibraryBig,
  MessageCircle,
  PanelLeft,
  Radio,
  ReceiptText,
  Rocket,
  Settings2,
  ShieldCheck,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StaffPermission } from '@/features/support/staff-access';
import { OnlineCountBadge } from './online-count-badge';
import { RememberedGroup } from './remembered-group';
import { TicketCountBadge } from './ticket-count-badge';
import { adminSectionFor, type AdminSection } from '../admin-section';

export type { AdminSection } from '../admin-section';

/** `requires`: `admin` (só administrador) ou a permissão de equipe que a página confere. */
type NavLink = {
  href: string;
  label: string;
  section: AdminSection;
  Icon: typeof Wrench;
  requires: 'admin' | StaffPermission;
};

type NavGroup = {
  label: string;
  links: readonly NavLink[];
  /** Grupos secundários lembram se estavam abertos e abrem quando a página atual é deles. */
  storageKey?: string;
};

/** O que a conta pode ver no menu: o servidor manda, a página confere de novo. */
export type AdminMenuAccess = { admin: boolean; permissions: readonly StaffPermission[] };

const groups: readonly NavGroup[] = [
  {
    label: 'Painel',
    links: [
      {
        href: '/admin',
        label: 'Visão geral',
        section: 'overview',
        Icon: LayoutDashboard,
        requires: 'admin',
      },
      {
        href: '/admin/online',
        label: 'Online agora',
        section: 'online',
        Icon: Radio,
        requires: 'admin',
      },
      {
        href: '/admin/novidades',
        label: 'Novidades',
        section: 'updates',
        Icon: History,
        requires: 'admin',
      },
    ],
  },
  {
    label: 'Suporte',
    links: [
      {
        href: '/admin/chamados',
        label: 'Chamados',
        section: 'tickets',
        Icon: MessageCircle,
        requires: 'support.answer',
      },
      {
        href: '/admin/suporte/desempenho',
        label: 'Desempenho',
        section: 'support-performance',
        Icon: BarChart3,
        requires: 'support.metrics',
      },
      {
        href: '/admin/suporte/equipe',
        label: 'Equipe',
        section: 'support-team',
        Icon: ShieldCheck,
        requires: 'team.manage',
      },
      {
        href: '/admin/suporte/configuracoes',
        label: 'Configurações',
        section: 'support-settings',
        Icon: Settings2,
        requires: 'support.settings',
      },
    ],
  },
  {
    label: 'Alunas e vendas',
    links: [
      {
        href: '/admin/contas',
        label: 'Contas',
        section: 'accounts',
        Icon: UsersRound,
        requires: 'admin',
      },
      {
        href: '/admin/acessos',
        label: 'Acessos das alunas',
        section: 'access',
        Icon: KeyRound,
        requires: 'admin',
      },
      { href: '/leads', label: 'Contatos', section: 'leads', Icon: UsersRound, requires: 'admin' },
      {
        href: '/admin/hotmart',
        label: 'Compras da Hotmart',
        section: 'hotmart',
        Icon: ReceiptText,
        requires: 'admin',
      },
    ],
  },
  {
    label: 'Conteúdo das alunas',
    storageKey: 'admin-menu-content',
    links: [
      {
        href: '/admin?area=welcome',
        label: 'Comece aqui',
        section: 'welcome',
        Icon: Rocket,
        requires: 'admin',
      },
      {
        href: '/admin?area=method',
        label: 'Método SLL',
        section: 'method',
        Icon: BookOpen,
        requires: 'admin',
      },
      {
        href: '/admin?area=courses',
        // Curto no menu, pra caber numa linha; o título da página continua completo.
        label: 'Cursos',
        section: 'courses',
        Icon: LibraryBig,
        requires: 'admin',
      },
      {
        href: '/admin/experts',
        label: 'Especialistas e vídeos',
        section: 'experts',
        Icon: UsersRound,
        requires: 'admin',
      },
      {
        href: '/admin/banners',
        label: 'Banners do painel',
        section: 'banners',
        Icon: Images,
        requires: 'admin',
      },
      {
        href: '/admin/textos',
        label: 'Textos das páginas',
        section: 'texts',
        Icon: FileText,
        requires: 'admin',
      },
      {
        href: '/admin/recursos',
        label: 'Recursos',
        section: 'resources',
        Icon: Wrench,
        requires: 'admin',
      },
      // Ícone próprio: o de livros já é dos cursos.
      {
        href: '/admin/arquivados',
        label: 'Itens arquivados',
        section: 'archived',
        Icon: Archive,
        requires: 'admin',
      },
    ],
  },
  {
    label: 'Operação',
    storageKey: 'admin-menu-operations',
    links: [
      {
        href: '/admin/assistente',
        label: 'Planos e operação',
        section: 'assistant',
        Icon: Wrench,
        requires: 'admin',
      },
      {
        href: '/admin/bling',
        label: 'Conexão Bling',
        section: 'bling',
        Icon: Wrench,
        requires: 'admin',
      },
    ],
  },
];

function visibleGroups(access: AdminMenuAccess): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) =>
        link.requires === 'admin' ? access.admin : access.permissions.includes(link.requires),
      ),
    }))
    .filter((group) => group.links.length > 0);
}

function NavLinks({
  links,
  current,
}: {
  links: readonly NavLink[];
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
            {/* Chamados esperando o suporte, atualizado sozinho. */}
            {section === 'tickets' ? <TicketCountBadge /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Navigation({
  current,
  menu,
}: {
  current: AdminSection | undefined;
  menu: readonly NavGroup[];
}) {
  return (
    <nav aria-label="Seções da administração" className="flex flex-col gap-4">
      {menu.map((group) =>
        group.storageKey ? (
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
 * conteúdo recolhível acima do título (celular e tablet). Cada pessoa vê só o que o cargo usa:
 * atendente vê os Chamados; administrador vê tudo.
 */
export function AdminSidebar({
  variant,
  access,
}: {
  variant: 'rail' | 'disclosure';
  access: AdminMenuAccess;
}) {
  // A seção sai do endereço: a moldura mora no `layout.tsx`, e o menu acompanha a troca na hora.
  const current = adminSectionFor(usePathname(), useSearchParams().get('area'));
  const menu = visibleGroups(access);
  if (variant === 'rail') return <Navigation current={current} menu={menu} />;
  const currentLabel = menu
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
        <Navigation current={current} menu={menu} />
      </div>
    </details>
  );
}

import Link from 'next/link';
import {
  Archive,
  BookOpen,
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

export type AdminSection =
  | 'overview'
  | 'online'
  | 'welcome'
  | 'method'
  | 'courses'
  | 'banners'
  | 'texts'
  | 'resources'
  | 'archived'
  | 'accounts'
  | 'access'
  | 'hotmart';

const groups = [
  {
    label: 'Painel',
    links: [
      { href: '/admin', label: 'Visão geral', section: 'overview', Icon: LayoutDashboard },
      { href: '/admin/online', label: 'Online agora', section: 'online', Icon: Radio },
    ],
  },
  {
    label: 'Contas e compras',
    links: [
      { href: '/admin/contas', label: 'Contas', section: 'accounts', Icon: UsersRound },
      { href: '/admin/acessos', label: 'Acessos das alunas', section: 'access', Icon: KeyRound },
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
    // O grupo mais longo e menos usado no dia a dia: abre e fecha, e lembra a escolha.
    collapsible: true,
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
      { href: '/admin/banners', label: 'Banners do painel', section: 'banners', Icon: Images },
      { href: '/admin/textos', label: 'Textos das páginas', section: 'texts', Icon: FileText },
      { href: '/admin/recursos', label: 'Recursos', section: 'resources', Icon: Wrench },
      // Ícone próprio: o de livros já é dos cursos.
      { href: '/admin/arquivados', label: 'Itens arquivados', section: 'archived', Icon: Archive },
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
              'flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150',
              current === section && 'bg-primary-soft font-semibold text-link',
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
    <nav aria-label="Seções da administração" className="flex flex-col gap-5">
      {groups.map((group) =>
        'collapsible' in group ? (
          <RememberedGroup
            containsCurrent={group.links.some((link) => link.section === current)}
            key={group.label}
            label={group.label}
            storageKey="admin-menu-content"
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
export function AdminSidebar({
  current,
  variant,
}: {
  current: AdminSection | undefined;
  variant: 'rail' | 'disclosure';
}) {
  if (variant === 'rail') return <Navigation current={current} />;
  return (
    <details className="rounded-card bg-card p-4 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
      <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {/* Abre a lista de seções (a do lado esquerdo no computador). */}
        <PanelLeft aria-hidden="true" className="size-5 text-link" />
        Seções do painel
      </summary>
      <div className="mt-4 border-t border-border pt-4">
        <Navigation current={current} />
      </div>
    </details>
  );
}

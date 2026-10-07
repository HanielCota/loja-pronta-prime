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
    links: [
      { href: '/admin?area=welcome', label: 'Comece aqui', section: 'welcome', Icon: Rocket },
      { href: '/admin?area=method', label: 'Método SLL', section: 'method', Icon: BookOpen },
      {
        href: '/admin?area=courses',
        label: 'Cursos complementares',
        section: 'courses',
        Icon: LibraryBig,
      },
      { href: '/admin/banners', label: 'Banners do painel', section: 'banners', Icon: Images },
      { href: '/admin/textos', label: 'Textos das páginas', section: 'texts', Icon: FileText },
      { href: '/admin/recursos', label: 'Recursos', section: 'resources', Icon: Wrench },
      // Ícone próprio: o de livros já é dos cursos complementares.
      { href: '/admin/arquivados', label: 'Itens arquivados', section: 'archived', Icon: Archive },
    ],
  },
] as const;

function Navigation({ current }: { current: AdminSection | undefined }) {
  return (
    <nav aria-label="Seções da administração" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-sm font-semibold text-muted-foreground">{group.label}</p>
          <ul className="flex flex-col gap-1">
            {group.links.map(({ href, label, section, Icon }) => (
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
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
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

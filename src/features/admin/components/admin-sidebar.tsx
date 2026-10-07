import Link from 'next/link';
import {
  Archive,
  BookOpen,
  FileText,
  Images,
  KeyRound,
  LibraryBig,
  PanelLeft,
  ReceiptText,
  Rocket,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdminSection =
  | 'welcome'
  | 'method'
  | 'courses'
  | 'banners'
  | 'texts'
  | 'resources'
  | 'archived'
  | 'access'
  | 'hotmart';

const contentLinks = [
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
] as const;

const accountLinks = [
  { href: '/admin/acessos', label: 'Acessos das alunas', section: 'access', Icon: KeyRound },
  { href: '/admin/hotmart', label: 'Compras da Hotmart', section: 'hotmart', Icon: ReceiptText },
] as const;

function Navigation({ current }: { current: AdminSection }) {
  return (
    <nav aria-label="Seções da administração" className="flex flex-col gap-5">
      <div>
        <p className="mb-2 px-3 text-sm font-semibold text-muted-foreground">Conteúdo das alunas</p>
        <ul className="flex flex-col gap-1">
          {contentLinks.map(({ href, label, section, Icon }) => (
            <li key={href}>
              <Link
                aria-current={current === section ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
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
      <div>
        <p className="mb-2 px-3 text-sm font-semibold text-muted-foreground">Contas e compras</p>
        <ul className="flex flex-col gap-1">
          {accountLinks.map(({ href, label, section, Icon }) => (
            <li key={href}>
              <Link
                aria-current={current === section ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-body text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
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
    </nav>
  );
}

/** A mesma navegação fica visível no computador e recolhível no celular. */
export function AdminSidebar({ current }: { current: AdminSection }) {
  return (
    <>
      <details className="rounded-card bg-card p-4 shadow-card lg:hidden forced-colors:border forced-colors:border-[CanvasText]">
        <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {/* Abre a lista de seções (a do lado esquerdo no computador). */}
          <PanelLeft aria-hidden="true" className="size-5 text-link" />
          Seções do painel
        </summary>
        <div className="mt-4 border-t border-border pt-4">
          <Navigation current={current} />
        </div>
      </details>
      {/* Preso logo abaixo da barra do topo (top-22: a barra de 4rem e um respiro). */}
      <aside className="hidden self-start rounded-card bg-card p-4 shadow-card lg:sticky lg:top-22 lg:block forced-colors:border forced-colors:border-[CanvasText]">
        <Navigation current={current} />
      </aside>
    </>
  );
}

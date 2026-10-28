import { SiteNavbar } from '@/components/brand/site-navbar';
import { ThemeToggleButton } from '@/features/theme/theme-toggle-button';
import type { ProductId } from '@/config/products';
import { staffPanelLinkOf } from '@/features/support/staff-access';
import { AccountMenu } from './account-menu';
import { AreaNav } from './area-nav';

/** Quem está logada, como a barra do topo mostra (o `user` da sessão serve direto). */
export type NavbarAccount = {
  name: string;
  preferredName?: string | null | undefined;
  email: string;
  image?: string | null | undefined;
  /** Papéis da conta (`user.role`), pra mostrar o atalho da equipe no menu. */
  role?: string | null | undefined;
};

/**
 * A barra do topo das telas de dentro: a de todas as telas, com a conta à direita. Com
 * `currentArea` (quem tem os dois produtos, dentro de uma área), as áreas viram abas.
 */
export function MemberNavbar({
  account,
  hasSidebar = false,
  sticky = false,
  currentArea,
  courseArea,
}: {
  account: NavbarAccount;
  hasSidebar?: boolean;
  /** Presa no topo ao rolar (as áreas, que têm páginas longas). */
  sticky?: boolean;
  currentArea?: ProductId | undefined;
  courseArea?: { href: string; label: string } | undefined;
}) {
  return (
    <SiteNavbar
      hasSidebar={hasSidebar}
      sticky={sticky}
      nav={currentArea ? <AreaNav current={currentArea} courseArea={courseArea} /> : undefined}
    >
      <div className="flex items-center gap-1">
        <ThemeToggleButton />
        <AccountMenu
          name={account.preferredName?.trim() || account.name}
          email={account.email}
          image={account.image}
          staffPanel={staffPanelLinkOf(account.role)}
        />
      </div>
    </SiteNavbar>
  );
}

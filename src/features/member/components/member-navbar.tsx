import { SiteNavbar } from '@/components/brand/site-navbar';
import { ThemeToggleButton } from '@/features/theme/theme-toggle-button';
import type { ProductId } from '@/config/products';
import { AccountMenu } from './account-menu';
import { AreaNav } from './area-nav';

/** Quem está logada, como a barra do topo mostra (o `user` da sessão serve direto). */
export type NavbarAccount = {
  name: string;
  preferredName?: string | null | undefined;
  email: string;
  image?: string | null | undefined;
};

/**
 * A barra do topo das telas de dentro: a de todas as telas, com a conta à direita. Com
 * `currentArea` (quem tem os dois produtos, dentro de uma área), as áreas viram abas.
 */
export function MemberNavbar({
  account,
  hasSidebar = false,
  currentArea,
}: {
  account: NavbarAccount;
  hasSidebar?: boolean;
  currentArea?: ProductId | undefined;
}) {
  return (
    <SiteNavbar
      hasSidebar={hasSidebar}
      nav={currentArea ? <AreaNav current={currentArea} /> : undefined}
    >
      <div className="flex items-center gap-1">
        <ThemeToggleButton />
        <AccountMenu
          name={account.preferredName?.trim() || account.name}
          email={account.email}
          image={account.image}
        />
      </div>
    </SiteNavbar>
  );
}

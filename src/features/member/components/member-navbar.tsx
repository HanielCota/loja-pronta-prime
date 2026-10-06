import { SiteNavbar } from '@/components/brand/site-navbar';
import { ThemeToggleButton } from '@/features/theme/theme-toggle-button';
import { AccountMenu } from './account-menu';

/** Quem está logada, como a barra do topo mostra (o `user` da sessão serve direto). */
export type NavbarAccount = {
  name: string;
  preferredName?: string | null | undefined;
  email: string;
  image?: string | null | undefined;
};

/** A barra do topo das telas de dentro: a de todas as telas, com a conta à direita. */
export function MemberNavbar({
  account,
  hasSidebar = false,
}: {
  account: NavbarAccount;
  hasSidebar?: boolean;
}) {
  return (
    <SiteNavbar hasSidebar={hasSidebar}>
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

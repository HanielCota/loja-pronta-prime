import { SiteNavbar } from '@/components/brand/site-navbar';
import { AccountMenu } from './account-menu';

/** Quem está logada, como a barra do topo mostra (o `user` da sessão serve direto). */
export type NavbarAccount = { name: string; email: string };

/** A barra do topo das telas de dentro: a de todas as telas, com a conta à direita. */
export function MemberNavbar({ account }: { account: NavbarAccount }) {
  return (
    <SiteNavbar>
      <AccountMenu name={account.name} email={account.email} />
    </SiteNavbar>
  );
}

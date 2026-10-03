import Image from 'next/image';
import Link from 'next/link';
import { AccountMenu } from './account-menu';

/** Quem está logada, como a barra do topo mostra (o `user` da sessão serve direto). */
export type NavbarAccount = { name: string; email: string };

/** Barra do topo das telas de dentro: a marca (que leva ao início) e a conta. */
export function MemberNavbar({ account }: { account: NavbarAccount }) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-4">
      <Link
        href="/"
        className="-ml-1 flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <Image src="/brand/mascote.png" alt="" width={36} height={36} className="size-9" />
        Loja Pronta Prime
      </Link>
      <AccountMenu name={account.name} email={account.email} />
    </header>
  );
}

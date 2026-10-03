import Image from 'next/image';
import Link from 'next/link';
import { AccountMenu } from './account-menu';

/** Quem está logada, como a barra do topo mostra (o `user` da sessão serve direto). */
export type NavbarAccount = { name: string; email: string };

/**
 * Barra do topo das telas de dentro, com uma linha embaixo de ponta a ponta: a marca à esquerda
 * (leva ao início) e a conta à direita. O voltar fica no conteúdo, na trilha acima do título.
 */
export function MemberNavbar({ account }: { account: NavbarAccount }) {
  return (
    <header className="border-b-2 border-border bg-background">
      <div className="mx-auto flex min-h-16 w-full max-w-[1040px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="-ml-1 flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <Image src="/brand/mascote.png" alt="" width={32} height={32} className="size-8" />
          Loja Pronta Prime
        </Link>
        <AccountMenu name={account.name} email={account.email} />
      </div>
    </header>
  );
}

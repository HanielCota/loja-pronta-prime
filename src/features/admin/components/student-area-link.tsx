'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye } from 'lucide-react';

/**
 * A volta pra área das alunas, já que o painel não tem a barra do topo: o início ou, a partir
 * dos contatos, a escolha de área. Sai do endereço porque a moldura mora no `layout.tsx`.
 */
export function StudentAreaLink() {
  const pathname = usePathname();
  const fromLeads = pathname === '/leads' || pathname.startsWith('/leads/');
  return (
    <Link
      href={fromLeads ? '/menu' : '/'}
      className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150"
    >
      <Eye aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      Ver a área das alunas
    </Link>
  );
}

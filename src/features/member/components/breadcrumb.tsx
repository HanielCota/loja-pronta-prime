import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';

export type Crumb = { href: string; label: string };

/**
 * Onde ela está e como voltar, numa linha pequena em cinza acima do título: "Início › Seu perfil".
 * Os passos anteriores são links; o último é a página atual. Sem botão: não disputa com o título,
 * e a altura de 44px garante o toque.
 */
export function Breadcrumb({ trail, current }: { trail: Crumb[]; current: string }) {
  return (
    <nav aria-label="Você está em">
      <ol className="flex min-h-11 flex-wrap items-center gap-x-1 text-body text-muted-foreground">
        {trail.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-x-1">
            <Link
              href={crumb.href}
              className="-mx-1 inline-flex min-h-11 items-center rounded-md px-1 font-medium text-link underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {crumb.label}
            </Link>
            <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0" />
          </li>
        ))}
        <li aria-current="page" className="min-w-0 wrap-anywhere">
          {current}
        </li>
      </ol>
    </nav>
  );
}

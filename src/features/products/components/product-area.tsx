import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import type { ProductId } from '@/config/products';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { PRODUCTS } from '../catalog';
import { firstName } from '../names';
import { SllPath } from './sll-path';
import { StoreJourney } from './store-journey';

type ProductAreaProps = {
  product: ProductId;
  user: { name: string };
  /** Primeira vez nesta área: boas-vindas; depois, "Bom te ver de novo". */
  firstVisit: boolean;
  /** Tem os dois produtos: a página leva de volta pra escolha. */
  hasChoice: boolean;
  /** Fase da loja (só na Loja Pronta). */
  storePhase?: number;
};

/**
 * Página da área de um produto. Quem confere o acesso é a página (requireProduct). Sem barra do
 * topo: quem tem os dois produtos volta pra escolha pelo link acima do cartão.
 */
export function ProductArea({
  product,
  user,
  firstVisit,
  hasChoice,
  storePhase,
}: ProductAreaProps) {
  const { welcome, summary, title: productTitle } = PRODUCTS[product];
  const name = firstName(user.name);
  const title = firstVisit ? welcome : `Bom te ver de novo${name ? `, ${name}` : ''}!`;

  return (
    <PageShell>
      {hasChoice ? (
        <Link
          href="/"
          className="-my-3 inline-flex min-h-11 items-center gap-1 self-start rounded-md font-medium text-muted-foreground transition-colors duration-100 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
          Início
        </Link>
      ) : null}
      <BrandCard expression="happy" compact>
        {/* Na primeira visita o título já diz o produto ("Boas-vindas à Loja Pronta"). */}
        <CardHeading
          eyebrow={firstVisit ? undefined : productTitle}
          title={title}
          description={summary}
        />
        {product === 'loja-pronta' ? <StoreJourney phase={storePhase ?? 1} /> : <SllPath />}
      </BrandCard>
      <SignOutButton />
    </PageShell>
  );
}

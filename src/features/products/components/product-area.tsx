import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import type { ProductId } from '@/config/products';
import { PRODUCTS } from '../catalog';
import { firstName } from '../names';
import { SllPath } from './sll-path';
import { StoreJourney } from './store-journey';

type ProductAreaProps = {
  product: ProductId;
  user: { name: string };
  /** Primeira vez nesta área: boas-vindas; depois, "Bom te ver de novo". */
  firstVisit: boolean;
  /** Fase da loja (só na Loja Pronta). */
  storePhase?: number;
};

/** Página da área de um produto. Quem confere o acesso é a página (requireProduct). */
export function ProductArea({ product, user, firstVisit, storePhase }: ProductAreaProps) {
  const { welcome, summary } = PRODUCTS[product];
  const name = firstName(user.name);
  const title = firstVisit ? welcome : `Bom te ver de novo${name ? `, ${name}` : ''}!`;

  return (
    <PageShell>
      <BrandCard expression="happy" compact>
        <CardHeading title={title} description={summary} />
        {product === 'loja-pronta' ? <StoreJourney phase={storePhase ?? 1} /> : <SllPath />}
      </BrandCard>
    </PageShell>
  );
}

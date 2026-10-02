import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import type { ProductId } from '@/config/products';
import { PRODUCTS } from '../catalog';
import { firstName } from '../names';
import { MemberShell } from './member-shell';
import { SllPath } from './sll-path';
import { StoreJourney } from './store-journey';

type ProductAreaProps = {
  product: ProductId;
  /** Produtos da aluna (com os dois, a barra do topo troca de área). */
  products: ProductId[];
  user: { name: string; email: string };
  /** Primeira vez nesta área: boas-vindas; depois, "Bom te ver de novo". */
  firstVisit: boolean;
  /** Fase da loja (só na Loja Pronta). */
  storePhase?: number;
};

/** Página da área de um produto. Quem confere o acesso é a página (requireProduct). */
export function ProductArea({ product, products, user, firstVisit, storePhase }: ProductAreaProps) {
  const { welcome, summary } = PRODUCTS[product];
  const name = firstName(user.name);
  const title = firstVisit ? welcome : `Bom te ver de novo${name ? `, ${name}` : ''}!`;

  return (
    <MemberShell header={{ products, current: product, name: user.name, email: user.email }}>
      <BrandCard expression="happy" compact>
        <CardHeading title={title} description={summary} />
        {product === 'loja-pronta' ? <StoreJourney phase={storePhase ?? 1} /> : <SllPath />}
      </BrandCard>
    </MemberShell>
  );
}

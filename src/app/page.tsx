import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { Button } from '@/components/ui/button';
import type { ProductId } from '@/config/products';
import { PRODUCTS } from '@/features/products/catalog';
import { CenteredMemberPage } from '@/features/member/components/area-shell';
import { ProductChooser } from '@/features/products/components/product-chooser';
import {
  chooserHeadline,
  SLL_CHOOSER_STATUS,
  type ProductStatus,
} from '@/features/products/chooser';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { storeChooserCard } from '@/features/loja-pronta/store-card';
import { firstName } from '@/features/products/names';
import { requireStudent } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: 'Início',
};

/**
 * Início de quem já entrou (e já criou a própria senha). Com os dois produtos, ela escolhe a
 * área (cada cartão mostra onde ela parou); com um só, entra direto nele; sem nenhum, explica o
 * que fazer. O sair fica no topo, como nas áreas.
 */
export default async function HomePage() {
  const { session, products, lastArea } = await requireStudent('/');
  const [onlyProduct] = products;
  if (products.length === 1 && onlyProduct) redirect(PRODUCTS[onlyProduct].path);

  const { user } = session;
  const name = firstName(user.name);

  if (products.length === 0) {
    return (
      <CenteredMemberPage account={user}>
        <BrandCard expression="happy" compact>
          <CardHeading
            title="Seu acesso ainda não foi liberado"
            description="Se você acabou de comprar, a liberação leva alguns minutos. Se já faz tempo, fale com o suporte."
          />
          {/* Link comum (recarrega a página): funciona sem JavaScript. */}
          <Button asChild>
            <Link href="/" prefetch={false}>
              Verificar de novo
            </Link>
          </Button>
        </BrandCard>
      </CenteredMemberPage>
    );
  }

  const store = products.includes('loja-pronta')
    ? storeChooserCard((await getStoreOverview(user.id)).phase)
    : undefined;
  const status: Partial<Record<ProductId, ProductStatus>> = {
    sll: SLL_CHOOSER_STATUS,
    ...(store ? { 'loja-pronta': store.status } : {}),
  };
  const { primary, description } = chooserHeadline({ store, lastArea });

  // Sem o cartão em volta: os produtos são os cartões, com o espaço da tela toda.
  return (
    <CenteredMemberPage account={user} wide>
      <div className="flex flex-col">
        <CardHeading
          className="mb-0"
          title={name ? `Oi, ${name}! Pra onde vamos?` : 'Pra onde vamos?'}
          description={description}
        />
      </div>
      <ProductChooser products={products} lastArea={lastArea} status={status} primary={primary} />
    </CenteredMemberPage>
  );
}

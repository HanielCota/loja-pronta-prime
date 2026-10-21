import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import type { ProductId } from '@/config/products';
import { CenteredMemberPage } from '@/features/member/components/area-shell';
import { ProductChooser } from '@/features/products/components/product-chooser';
import {
  chooserHeadline,
  SLL_CHOOSER_STATUS,
  type ProductStatus,
} from '@/features/products/chooser';
import { getBrand } from '@/features/brand/server/brand';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { storeChooserCard } from '@/features/loja-pronta/store-card';
import { greetingName } from '@/features/products/names';
import { PRODUCTS } from '@/features/products/catalog';
import { requireStudent } from '@/features/products/server/access';
import { listLegacyStoresForUser } from '@/features/legacy-stores/server/queries';

type ProductLobbyProps = {
  /** Só a página inicial entra direto quando a aluna tem um único produto. */
  enterSingleProduct?: boolean;
};

/** Menu das áreas liberadas para a aluna; a marca da navbar sempre chega aqui. */
export async function ProductLobby({ enterSingleProduct = false }: ProductLobbyProps) {
  const { session, products, lastArea } = await requireStudent(enterSingleProduct ? '/' : '/menu');
  const [onlyProduct] = products;
  if (enterSingleProduct && products.length === 1 && onlyProduct) {
    redirect(PRODUCTS[onlyProduct].path);
  }

  const { user } = session;
  const name = greetingName(user);

  if (products.length === 0) {
    return (
      <CenteredMemberPage account={user}>
        <BrandCard expression="happy" compact>
          <CardHeading
            title="Seu acesso ainda não foi liberado"
            description="Confira se este é o email da compra. Se o acesso não aparecer, consulte a compra na Hotmart e use os contatos do produtor."
          />
          {/* Link comum (recarrega a página): funciona sem JavaScript. */}
          <Button asChild>
            {/* Recarregar é necessário para consultar um acesso recém-liberado, sem o cache da navegação. */}
            {/* oxlint-disable-next-line next/no-html-link-for-pages */}
            <a href="/menu">Verificar de novo</a>
          </Button>
        </BrandCard>
      </CenteredMemberPage>
    );
  }

  const store = products.includes('loja-pronta') ? await storeCard(user.id) : undefined;
  const status: Partial<Record<ProductId, ProductStatus>> = {
    sll: SLL_CHOOSER_STATUS,
    ...(store ? { 'loja-pronta': store.status } : {}),
  };
  const { primary, description } = chooserHeadline({
    store,
    lastArea,
    hasSllAccess: products.includes('sll'),
  });

  return (
    <CenteredMemberPage account={user} wide={products.length > 1}>
      <div className="flex flex-col gap-6">
        <Logo expression="happy" />
        <CardHeading
          className="mb-0"
          title={name ? `Oi, ${name}! Pra onde vamos?` : 'Pra onde vamos?'}
          description={description}
        />
      </div>
      <div className={products.length === 1 ? 'mx-auto w-full max-w-[512px]' : undefined}>
        <ProductChooser products={products} lastArea={lastArea} status={status} primary={primary} />
      </div>
    </CenteredMemberPage>
  );
}

/** O cartão da Loja Pronta, com a mesma regra do painel pro logo que falta. */
async function storeCard(userId: string) {
  const [{ phase, conversation }, brand, previousStores] = await Promise.all([
    getStoreOverview(userId),
    getBrand(userId),
    listLegacyStoresForUser(userId),
  ]);
  if (previousStores.length && phase === 1 && conversation === 'nao-comecou') {
    return {
      status: {
        caption: 'Previous stores',
        label: `${previousStores.length} saved ${previousStores.length === 1 ? 'store' : 'stores'}`,
        detail: 'Review recorded deliveries, store details and products.',
        cta: 'View my stores',
      },
      waitsOnStudent: true,
    };
  }
  return storeChooserCard(phase, {
    missingLogo: Boolean(brand.completedAt) && !brand.logoImage,
  });
}

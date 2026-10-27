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
import { StaffVisitBanner } from '@/features/support/server/staff-visit-banner';
import { listLegacyStoresForUser } from '@/features/legacy-stores/server/queries';
import { getStudentExperience } from '@/features/sll/server/experience';

type ProductLobbyProps = {
  /** Só a página inicial entra direto quando a aluna tem um único produto. */
  enterSingleProduct?: boolean;
};

/** Menu das áreas liberadas para a aluna; a marca da navbar sempre chega aqui. */
export async function ProductLobby({ enterSingleProduct = false }: ProductLobbyProps) {
  const { session, products, lastArea } = await requireStudent(enterSingleProduct ? '/' : '/menu');
  const experience = products.includes('sll') ? await getStudentExperience(session.user.id) : null;
  const course =
    experience?.expert === 'ze'
      ? {
          ...PRODUCTS.sll,
          title: 'Curso Zé Mauro',
          path: '/ze-mauro' as const,
          pitch: 'Assista às aulas do Zé Mauro para preparar sua loja e vender na Shopee.',
        }
      : undefined;
  const [onlyProduct] = products;
  if (enterSingleProduct && products.length === 1 && onlyProduct) {
    redirect(onlyProduct === 'sll' && course ? course.path : PRODUCTS[onlyProduct].path);
  }

  const { user } = session;
  const name = greetingName(user);

  if (products.length === 0) {
    return (
      <>
        <StaffVisitBanner />
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
      </>
    );
  }

  const store = products.includes('loja-pronta') ? await storeCard(user.id) : undefined;
  const status: Partial<Record<ProductId, ProductStatus>> = {
    sll: course
      ? { label: 'Suas aulas com o Zé Mauro', cta: 'Acessar meu curso' }
      : SLL_CHOOSER_STATUS,
    ...(store ? { 'loja-pronta': store.status } : {}),
  };
  const { primary, description } = chooserHeadline({
    store,
    lastArea,
    hasSllAccess: products.includes('sll'),
  });

  return (
    <>
      <StaffVisitBanner />
      <CenteredMemberPage account={user} wide={products.length > 1}>
        <div className="flex flex-col gap-6">
          <Logo expression="happy" />
          <CardHeading
            className="mb-0"
            title={name ? `Oi, ${name}! Pra onde vamos?` : 'Pra onde vamos?'}
            description={course ? description.replace('do SLL', 'do Zé Mauro') : description}
          />
        </div>
        <div className={products.length === 1 ? 'mx-auto w-full max-w-[512px]' : undefined}>
          <ProductChooser
            products={products}
            lastArea={lastArea}
            status={status}
            primary={primary}
            course={course}
          />
        </div>
      </CenteredMemberPage>
    </>
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
        caption: 'Lojas anteriores',
        label: `${previousStores.length} ${previousStores.length === 1 ? 'loja salva' : 'lojas salvas'}`,
        detail: 'Veja as entregas registradas, os dados das lojas e os produtos.',
        cta: 'Ver minhas lojas',
      },
      waitsOnStudent: true,
    };
  }
  return storeChooserCard(phase, {
    missingLogo: Boolean(brand.completedAt) && !brand.logoImage,
  });
}

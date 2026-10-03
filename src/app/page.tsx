import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { Button } from '@/components/ui/button';
import type { ProductId } from '@/config/products';
import { STORE_PHASES } from '@/config/store-phases';
import { PRODUCTS } from '@/features/products/catalog';
import { CenteredMemberPage } from '@/features/member/components/area-shell';
import { ProductChooser, type ProductStatus } from '@/features/products/components/product-chooser';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
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
      <CenteredMemberPage>
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

  const status: Partial<Record<ProductId, ProductStatus>> = {
    // As aulas ainda não estão no ar: o cartão diz isso, em vez de mandar ela começar.
    sll: { label: 'As aulas abrem em breve' },
  };
  // A Loja Pronta parada esperando por ela vem antes de tudo: leva o botão cheio, e o texto de
  // cima aponta pra ela.
  // Com a loja nas mãos da equipe, nenhum botão "manda" pra lá (nem pro curso, que ainda não abriu):
  // o texto de cima avisa que a equipe chama no WhatsApp.
  let primary: ProductId | undefined;
  let storeWithTeam = false;
  if (products.includes('loja-pronta')) {
    const { phase } = await getStoreOverview(user.id);
    const current = STORE_PHASES[phase - 1];
    status['loja-pronta'] = {
      caption: `Fase ${phase} de ${STORE_PHASES.length}`,
      label: current?.title ?? '',
      bar: { step: phase, total: STORE_PHASES.length },
      detail: current?.detail,
    };
    if (current?.needsStudent) primary = 'loja-pronta';
    else storeWithTeam = true;
  }

  // Sem o cartão em volta: os produtos são os cartões, com o espaço da tela toda.
  return (
    <CenteredMemberPage wide>
      <div className="flex flex-col">
        <CardHeading
          className="mb-0"
          title={name ? `Oi, ${name}! Pra onde vamos?` : 'Pra onde vamos?'}
          description={
            primary === 'loja-pronta'
              ? 'Sua loja está esperando por você.'
              : storeWithTeam
                ? 'Sua loja está com a equipe. Você recebe um aviso no WhatsApp quando for sua vez.'
                : lastArea
                  ? 'Continue de onde parou.'
                  : 'Escolha por onde começar.'
          }
        />
      </div>
      <ProductChooser products={products} lastArea={lastArea} status={status} primary={primary} />
    </CenteredMemberPage>
  );
}

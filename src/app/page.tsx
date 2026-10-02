import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';
import type { ProductId } from '@/config/products';
import { STORE_PHASES } from '@/config/store-phases';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { PRODUCTS } from '@/features/products/catalog';
import { ProductChooser, type ProductStatus } from '@/features/products/components/product-chooser';
import { firstName } from '@/features/products/names';
import { getStorePhase, requireStudent } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: 'Início',
};

/**
 * Início de quem já entrou (e já criou a própria senha). Com os dois produtos, ela escolhe a
 * área (cada cartão mostra onde ela parou); com um só, entra direto nele; sem nenhum, explica o
 * que fazer. Abaixo de tudo, o sair.
 */
export default async function HomePage() {
  const { session, products, lastArea } = await requireStudent('/');
  const [onlyProduct] = products;
  if (products.length === 1 && onlyProduct) redirect(PRODUCTS[onlyProduct].path);

  const { user } = session;
  const name = firstName(user.name);

  if (products.length === 0) {
    return (
      <PageShell>
        <BrandCard expression="happy" compact>
          <CardHeading
            title="Seu acesso ainda não foi liberado"
            description="Se você acabou de comprar, a liberação leva alguns minutos. Se já faz tempo, fala com o suporte."
          />
          {/* Link comum (recarrega a página): funciona sem JavaScript. */}
          <Button asChild>
            <Link href="/" prefetch={false}>
              Verificar de novo
            </Link>
          </Button>
        </BrandCard>
        <SignOutButton />
      </PageShell>
    );
  }

  const status: Partial<Record<ProductId, ProductStatus>> = {
    sll: { label: 'Comece pela trilha de boas-vindas' },
  };
  // A Loja Pronta parada esperando por ela vem antes de tudo: leva o botão cheio.
  let primary: ProductId | undefined;
  if (products.includes('loja-pronta')) {
    const phase = await getStorePhase(user.id);
    const current = STORE_PHASES[phase - 1];
    status['loja-pronta'] = {
      label: `Fase ${phase} de ${STORE_PHASES.length} · ${current?.title}`,
      bar: { step: phase, total: STORE_PHASES.length },
      detail: current?.detail,
    };
    if (current?.needsStudent) primary = 'loja-pronta';
  }

  // Sem o cartão em volta: os produtos são os cartões, com o espaço da tela toda.
  return (
    <PageShell wide>
      <div className="flex flex-col gap-8 short:gap-4">
        <Logo expression="happy" compact />
        <CardHeading
          title={name ? `Oi, ${name}! Pra onde vamos?` : 'Pra onde vamos?'}
          description={lastArea ? 'Continue de onde parou.' : 'Escolha por onde começar.'}
        />
      </div>
      <ProductChooser products={products} lastArea={lastArea} status={status} primary={primary} />
      <SignOutButton />
    </PageShell>
  );
}

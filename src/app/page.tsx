import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';
import { STORE_PHASES } from '@/config/store-phases';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { PRODUCTS } from '@/features/products/catalog';
import {
  ProductChooser,
  type ProductProgress,
} from '@/features/products/components/product-chooser';
import { firstName } from '@/features/products/names';
import { getStorePhase, requireStudent } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: 'Início',
};

/**
 * Início de quem já entrou (e já criou a própria senha). Com os dois produtos, ela escolhe a
 * área (cada bloco mostra onde ela parou); com um só, entra direto nele; sem nenhum, explica o
 * que fazer. Abaixo do cartão, o sair.
 */
export default async function HomePage() {
  const { session, products, lastArea } = await requireStudent('/');
  const [onlyProduct] = products;
  if (products.length === 1 && onlyProduct) redirect(PRODUCTS[onlyProduct].path);

  const { user } = session;
  const name = firstName(user.name);
  const progress = products.includes('loja-pronta')
    ? { 'loja-pronta': storeProgress(await getStorePhase(user.id)) }
    : undefined;

  return (
    <PageShell>
      <BrandCard expression="happy" compact>
        {products.length > 0 ? (
          <>
            <CardHeading
              title={name ? `Oi, ${name}! Pra onde vamos?` : 'Pra onde vamos?'}
              description="Escolha por onde começar."
            />
            <ProductChooser products={products} lastArea={lastArea} progress={progress} />
          </>
        ) : (
          <>
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
          </>
        )}
      </BrandCard>
      <SignOutButton />
    </PageShell>
  );
}

function storeProgress(phase: number): ProductProgress {
  const total = STORE_PHASES.length;
  return {
    step: phase,
    total,
    label: `Fase ${phase} de ${total} · ${STORE_PHASES[phase - 1]?.title}`,
  };
}

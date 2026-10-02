import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { Button } from '@/components/ui/button';
import { PRODUCTS } from '@/features/products/catalog';
import { MemberShell } from '@/features/products/components/member-shell';
import { ProductChooser } from '@/features/products/components/product-chooser';
import { firstName } from '@/features/products/names';
import { requireStudent } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: 'Início',
};

/**
 * Início de quem já entrou (e já criou a própria senha). Com os dois produtos, ela escolhe a
 * área; com um só, entra direto nele; sem nenhum, explica o que fazer.
 */
export default async function HomePage() {
  const { session, products, lastArea } = await requireStudent('/');
  const [onlyProduct] = products;
  if (products.length === 1 && onlyProduct) redirect(PRODUCTS[onlyProduct].path);

  const { user } = session;
  const name = firstName(user.name);

  return (
    <MemberShell products={products} name={user.name} email={user.email}>
      <BrandCard expression="happy" compact>
        {products.length > 0 ? (
          <>
            <CardHeading
              title={name ? `Oi, ${name}! Pra onde vamos?` : 'Pra onde vamos?'}
              description="Escolha por onde começar. Dá pra trocar depois."
            />
            <ProductChooser products={products} lastArea={lastArea} />
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
    </MemberShell>
  );
}

import { DownloadIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CardHeading } from '@/components/brand/card-heading';
import { Button } from '@/components/ui/button';
import { LOGO_DOWNLOAD_PATH, logoPreviewSrc } from '@/features/brand/logo-preview';
import { getBrand } from '@/features/brand/server/brand';
import { BRAND_DONE_PATH, BRAND_PATH } from '@/features/brand/steps';
import {
  CenteredMemberPage,
  panelCard,
  sectionTitleClass,
} from '@/features/member/components/area-shell';
import { greetingName } from '@/features/products/names';
import { requireProduct } from '@/features/products/server/access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Marca pronta',
};

/** Fim da marca: o logo grande, o arquivo pra baixar e o que vem depois. */
export default async function BrandDonePage() {
  const { session } = await requireProduct('loja-pronta', BRAND_DONE_PATH);
  const brand = await getBrand(session.user.id);
  if (!brand.completedAt || !brand.logo || !brand.name) redirect(BRAND_PATH);
  const name = greetingName(session.user);

  return (
    <CenteredMemberPage
      account={session.user}
      trail={[
        { href: '/', label: 'Início' },
        { href: '/loja-pronta', label: 'Loja Pronta' },
      ]}
      current="Marca pronta"
    >
      <div className="flex flex-col items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoPreviewSrc(brand.logo)}
          alt={`Logo da loja ${brand.name}`}
          width={220}
          height={220}
          className="size-52 rounded-3xl border border-border bg-card shadow-card"
        />
        <CardHeading
          className="mb-0"
          title={name ? `Sua marca está pronta, ${name}!` : 'Sua marca está pronta!'}
          description={`A loja ${brand.name} já tem nome, logo e texto.`}
        />
        <Button asChild variant="soft">
          <a href={LOGO_DOWNLOAD_PATH} download>
            <DownloadIcon aria-hidden="true" />
            Baixar meu logo
          </a>
        </Button>
      </div>
      <section aria-labelledby="proximo-passo" className={cn(panelCard, 'gap-3')}>
        <h2 id="proximo-passo" className={sectionTitleClass}>
          Próximo passo: sua conta na Shopee
        </h2>
        <p className="text-body text-pretty text-muted-foreground">
          Você vai abrir sua conta de vendedora na Shopee, com um passo a passo bem explicado.
          Estamos preparando essa parte e avisamos no WhatsApp quando ela abrir.
        </p>
      </section>
      <Button asChild>
        <Link href="/loja-pronta">Ver a minha loja</Link>
      </Button>
    </CenteredMemberPage>
  );
}

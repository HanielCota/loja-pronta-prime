import { ArrowRightIcon, DownloadIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CardHeading } from '@/components/brand/card-heading';
import { Button } from '@/components/ui/button';
import { SHOPEE_CONNECT_PATH, SHOPEE_PATH } from '@/config/shopee';
import { getBrand } from '@/features/brand/server/brand';
import {
  BRAND_DONE_PATH,
  BRAND_PATH,
  brandLogoSrc,
  LOGO_DOWNLOAD_PATH,
} from '@/features/brand/steps';
import {
  CenteredMemberPage,
  panelCard,
  sectionTitleClass,
} from '@/features/member/components/area-shell';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { greetingName } from '@/features/products/names';
import { requireProduct } from '@/features/products/server/access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Marca pronta',
};

/** Fim da marca: o logo grande, o arquivo pra baixar e o que vem depois. */
export default async function BrandDonePage() {
  const { session } = await requireProduct('loja-pronta', BRAND_DONE_PATH);
  const [brand, phase] = await Promise.all([
    getBrand(session.user.id),
    getStorePhase(session.user.id),
  ]);
  if (!brand.completedAt || !brand.logoImage || !brand.name) redirect(BRAND_PATH);
  const name = greetingName(session.user);
  // Quem já tinha loja na Shopee pula a criação da conta e vai direto pra conexão (fase 4).
  const next =
    phase === 4
      ? {
          title: 'Próximo passo: conectar a sua Shopee',
          text: 'Como você já tem loja na Shopee, falta só ligar ela aqui pra gente publicar a sua marca e os produtos.',
          href: SHOPEE_CONNECT_PATH,
          label: 'Ver como funciona a conexão',
        }
      : {
          title: 'Próximo passo: sua conta na Shopee',
          text: 'Você abre sua conta de vendedora na Shopee, com um passo a passo bem explicado. Leva uns 15 minutos.',
          href: SHOPEE_PATH,
          label: 'Abrir minha conta na Shopee',
        };

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
          src={brandLogoSrc(brand)}
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
          {next.title}
        </h2>
        <p className="text-body text-pretty text-muted-foreground">{next.text}</p>
      </section>
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link href={next.href}>
            {next.label}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/loja-pronta">Fazer depois</Link>
        </Button>
      </div>
    </CenteredMemberPage>
  );
}

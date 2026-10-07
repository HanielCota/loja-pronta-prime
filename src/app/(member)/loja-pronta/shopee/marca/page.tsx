import { DownloadIcon, ExternalLinkIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { SHOPEE_BRAND_PATH, SHOPEE_CONNECT_PATH, SHOPEE_SELLER_URL } from '@/config/shopee';
import { getBrand } from '@/features/brand/server/brand';
import { brandLogoSrc, LOGO_DOWNLOAD_PATH } from '@/features/brand/steps';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import {
  CenteredMemberPage,
  panelCard,
  sectionTitleClass,
} from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { CopyText } from '@/features/shopee/components/copy-text';
import { GuideVideo } from '@/features/videos/server/guide-video';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Sua marca na Shopee' };

/** Da conexão em diante (fase 4): ela já tem a conta na Shopee, onde colocar a marca. */
const FIRST_PHASE = 4;

/**
 * Enquanto a plataforma não publica a marca sozinha (fase 6, em breve), ela coloca o logo e o
 * texto na loja da Shopee com as próprias mãos: o passo a passo, o logo pra baixar e o texto pra
 * copiar, tudo numa tela. Com um vídeo enviado pro espaço "marca-na-shopee", ele aparece em cima.
 */
export default async function ShopeeBrandPage() {
  const { session } = await requireProduct('loja-pronta', SHOPEE_BRAND_PATH);
  const userId = session.user.id;
  const [phase, brand] = await Promise.all([getStorePhase(userId), getBrand(userId)]);
  // Sem a conta na Shopee ainda, ou sem a marca completa (o painel diz o que falta).
  if (phase < FIRST_PHASE || !brand.completedAt || !brand.logoImage || !brand.name) {
    redirect('/loja-pronta');
  }

  const steps = [
    'Baixe o seu logo no botão "Baixar meu logo", mais abaixo.',
    'Entre na Central do Vendedor da Shopee, com a sua conta de vendedora.',
    'Abra o Perfil da Loja.',
    'Troque a foto da loja pelo seu logo.',
    `Confira se o nome da loja está igual: ${brand.name}.`,
    'Cole o texto da sua loja na descrição e salve.',
  ];

  return (
    <CenteredMemberPage
      account={session.user}
      trail={[
        { href: '/', label: 'Início' },
        { href: '/loja-pronta', label: 'Loja Pronta' },
      ]}
      current="Sua marca na Shopee"
    >
      <div className="flex flex-col gap-6">
        <Logo expression="happy" compact />
        <CardHeading
          className="mb-0"
          title="Coloque sua marca na Shopee"
          description="A plataforma ainda não publica sua marca sozinha. Por enquanto, você coloca o logo e o texto na sua loja. É rápido: siga os passos abaixo."
        />
        <GuideVideo slot="marca-na-shopee" />
        <section aria-labelledby="como" className={cn(panelCard, 'gap-3')}>
          <h2 id="como" className={sectionTitleClass}>
            Como fazer
          </h2>
          <ol className="flex flex-col gap-3">
            {steps.map((item, index) => (
              <li key={item} className="flex gap-3 text-body text-pretty">
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-link forced-colors:border forced-colors:border-[CanvasText]"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="sua-marca" className={cn(panelCard, 'gap-5')}>
          <h2 id="sua-marca" className={sectionTitleClass}>
            O que levar pra Shopee
          </h2>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandLogoSrc(brand)}
              alt={`Logo da loja ${brand.name}`}
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-2xl border border-border"
            />
            <Button asChild variant="soft" className="flex-1">
              <a href={LOGO_DOWNLOAD_PATH} download>
                <DownloadIcon aria-hidden="true" />
                Baixar meu logo
              </a>
            </Button>
          </div>
          {brand.description ? (
            <CopyText id="texto-da-loja" label="O texto da sua loja" text={brand.description} />
          ) : null}
        </section>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <a href={SHOPEE_SELLER_URL} target="_blank" rel="noreferrer">
              Abrir a Central do Vendedor
              <ExternalLinkIcon aria-hidden="true" />
              <span className="sr-only"> (abre em outra aba)</span>
            </a>
          </Button>
          <Button asChild variant="ghost" className="text-link">
            <Link href={SHOPEE_CONNECT_PATH}>Como vai funcionar a conexão automática</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/loja-pronta">Voltar pra Loja Pronta</Link>
          </Button>
        </div>
      </div>
    </CenteredMemberPage>
  );
}

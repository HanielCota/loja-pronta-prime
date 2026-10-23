import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Select } from '@/components/ui/select';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { getBrand } from '@/features/brand/server/brand-store';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { BANNER_KIT_PATH, bannerVariants, kitIsApproved } from '@/features/brand/banner-kit/model';
import { readBannerKit } from '@/features/brand/banner-kit/server/kit';
import { approveBanners, saveBanners } from '@/features/brand/banner-kit/server/actions';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Meus banners' };

export default async function BannerKitPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct('loja-pronta', BANNER_KIT_PATH);
  const [brand, kit, params] = await Promise.all([
    getBrand(session.user.id),
    readBannerKit(session.user.id),
    searchParams,
  ]);
  if (!brand.completedAt || !brand.name || !brand.logoImage || !brand.description)
    redirect('/loja-pronta/marca');
  const fingerprint = brandFingerprint(brand);
  const current = kit?.brandFingerprint === fingerprint;
  const approved = kit && kitIsApproved(kit, fingerprint);
  const result = getParam(params.resultado);
  const error =
    result === 'invalid'
      ? 'Preencha os textos dentro dos limites indicados.'
      : result === 'changed'
        ? 'A marca ou o kit mudou. Confira a versão atual e tente novamente.'
        : null;
  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Banners"
      title="Meus banners"
      intro="Prepare os banners, confira as imagens e aprove antes de baixar."
    >
      {error ? (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      ) : null}
      {result === 'saved' || result === 'approved' ? (
        <output className="text-body text-progress-text">
          {result === 'saved'
            ? 'Prévia salva. Confira os dois banners antes de aprovar.'
            : 'Kit aprovado. Você já pode baixar os banners.'}
        </output>
      ) : null}
      <section className={panelCard} aria-labelledby="banner-edit">
        <h2 id="banner-edit" className="text-title font-semibold">
          {kit ? 'Ajustar meu kit' : 'Preparar meu kit'}
        </h2>
        {kit && !current ? (
          <p className="text-body text-muted-foreground">
            Sua marca mudou. Salve uma nova prévia para usar o nome e o logo atuais. A aprovação
            anterior não vale para a nova marca.
          </p>
        ) : null}
        <form action={saveBanners} className="flex flex-col gap-4">
          <input type="hidden" name="revision" value={kit?.revision ?? ''} />
          <FloatingLabelInput
            id="banner-title"
            name="title"
            label="Frase de boas-vindas"
            defaultValue={kit?.title ?? 'Encontre seu próximo favorito'}
            maxLength={48}
            required
            aria-describedby="banner-title-help"
          />
          <p id="banner-title-help" className="text-sm text-muted-foreground">
            Até 48 caracteres. Essa frase aparece nos dois banners.
          </p>
          <FloatingLabelInput
            id="banner-subtitle"
            name="subtitle"
            label="Texto do banner de seleção"
            defaultValue={kit?.subtitle ?? 'Conheça os produtos da nossa loja'}
            maxLength={80}
            required
            aria-describedby="banner-subtitle-help"
          />
          <p id="banner-subtitle-help" className="text-sm text-muted-foreground">
            Até 80 caracteres. Use apenas informações verdadeiras sobre sua loja.
          </p>
          <label htmlFor="banner-palette" className="text-body">
            Cores dos banners
          </label>
          <Select id="banner-palette" name="palette" defaultValue={kit?.palette ?? 'violet'}>
            <option value="violet">Roxo suave</option>
            <option value="rose">Rosa suave</option>
            <option value="ocean">Azul suave</option>
            <option value="forest">Verde suave</option>
          </Select>
          <p className="text-body text-muted-foreground">
            Salvar uma alteração pede uma nova aprovação.
          </p>
          <Button variant={current ? 'soft' : 'default'}>
            {kit ? 'Salvar nova prévia' : 'Criar prévia dos banners'}
          </Button>
        </form>
      </section>
      {kit && current ? (
        <section className={panelCard} aria-labelledby="banner-preview">
          <h2 id="banner-preview" className="text-title font-semibold">
            {approved ? 'Kit aprovado' : 'Confira seus banners'}
          </h2>
          <p className="text-body text-muted-foreground">
            Estas são as imagens dos arquivos. A posição e os cortes na loja dependem do bloco
            escolhido na Shopee.
          </p>
          {bannerVariants.map((variant) => {
            const src = `${BANNER_KIT_PATH}/${variant}.png?v=${kit.revision}`;
            const label = variant === 'welcome' ? 'Boas-vindas' : 'Seleção de produtos';
            return (
              <figure key={variant} className="flex min-w-0 flex-col gap-3">
                <figcaption className="text-body font-semibold">
                  {label} · 750 × {variant === 'welcome' ? 300 : 500} px
                </figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Prévia do banner ${label.toLowerCase()} da loja ${brand.name}`}
                  width={750}
                  height={variant === 'welcome' ? 300 : 500}
                  className="h-auto w-full rounded-2xl border border-border"
                />
                {approved ? (
                  <Button asChild variant="soft">
                    <a href={`${src}&baixar=1`} download>
                      Baixar banner de {label.toLowerCase()}
                    </a>
                  </Button>
                ) : null}
              </figure>
            );
          })}
          {!approved ? (
            <form action={approveBanners} className="flex flex-col gap-4">
              <input type="hidden" name="revision" value={kit.revision} />
              <label className="flex min-h-11 items-center gap-3 text-body">
                <input type="checkbox" name="confirmed" value="true" required />
                Conferi os dois banners e quero usar esta versão.
              </label>
              <Button>Aprovar meu kit</Button>
            </form>
          ) : null}
        </section>
      ) : null}
      <section className={panelCard} aria-labelledby="banner-guide">
        <h2 id="banner-guide" className="text-title font-semibold">
          Como colocar os banners na Shopee
        </h2>
        <p className="text-body text-muted-foreground">
          Os banners ainda não são aplicados automaticamente. O envio do nome, logo e descrição é
          separado da decoração.
        </p>
        <ol className="list-decimal space-y-3 pl-6 text-body">
          <li>Aprove o kit e baixe os dois arquivos PNG.</li>
          <li>
            Entre na Central do Vendedor com a conta da sua loja. No menu da loja, procure Decoração
            da Loja. Os nomes podem variar.
          </li>
          <li>
            Abra a edição e adicione um bloco de imagem. Confira os formatos aceitos no próprio
            bloco e escolha o arquivo baixado.
          </li>
          <li>
            Confira o corte e, se quiser, vincule a imagem a um produto ou categoria que já exista
            na sua loja.
          </li>
          <li>
            Veja a prévia no celular e no computador. Salve e publique na Shopee. Depois abra sua
            loja para conferir.
          </li>
        </ol>
        <p className="text-body text-muted-foreground">
          Se a opção não aparecer ou o tamanho não for aceito, consulte a ajuda da Shopee para sua
          conta. Baixar ou aprovar o kit aqui não publica a decoração por lá.
        </p>
      </section>
      <Button asChild variant="ghost">
        <Link href="/loja-pronta">Voltar pra minha loja</Link>
      </Button>
    </AreaShell>
  );
}

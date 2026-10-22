import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CenteredMemberPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { getBrand } from '@/features/brand/server/brand-store';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { brandLogoSrc } from '@/features/brand/steps';
import { confirmSavedBrand } from '@/features/assistant/server/store-change-actions';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Confirmar envio da marca' };

export default async function PublicationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session } = await requireProduct('loja-pronta', '/loja-pronta/marca/publication');
  const [brand, params] = await Promise.all([getBrand(session.user.id), searchParams]);
  if (!brand.completedAt || !brand.name || !brand.logoImage || !brand.description)
    redirect('/loja-pronta/marca');
  return (
    <CenteredMemberPage
      account={session.user}
      trail={[{ href: '/loja-pronta', label: 'Minha loja' }]}
      current="Envio da marca"
    >
      <section className={panelCard} aria-labelledby="publication-title">
        <h1 id="publication-title" className="text-title-lg font-semibold text-balance">
          Confira a marca que será enviada
        </h1>
        <p className="text-body text-muted-foreground">
          Esta confirmação autoriza o envio automático do nome, logo e descrição quando sua loja
          estiver conectada e o recurso estiver liberado.
        </p>
        {getParam(params.resultado) === 'changed' ? (
          <p role="alert" className="text-body text-destructive">
            A marca mudou ou faltou confirmar. Confira os dados atuais antes de continuar.
          </p>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandLogoSrc(brand)}
          alt={`Logo da loja ${brand.name}`}
          width={180}
          height={180}
          className="size-44 rounded-2xl border border-border"
        />
        <dl className="space-y-3 text-body">
          <div>
            <dt className="text-muted-foreground">Nome da loja</dt>
            <dd className="font-semibold wrap-anywhere">{brand.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Descrição</dt>
            <dd className="wrap-anywhere">{brand.description}</dd>
          </div>
        </dl>
        <p className="text-body text-muted-foreground">
          Os banners e a decoração são separados. Você baixa os arquivos aprovados e aplica na
          Central do Vendedor.
        </p>
        <form action={confirmSavedBrand} className="flex flex-col gap-4">
          <input type="hidden" name="fingerprint" value={brandFingerprint(brand)} />
          <label className="flex min-h-11 items-center gap-3 text-body">
            <input type="checkbox" name="confirmed" value="true" required />
            Quero aplicar este nome, logo e descrição na minha loja conectada.
          </label>
          <Button>Autorizar envio automático da marca</Button>
        </form>
      </section>
      <Button asChild variant="ghost">
        <Link href="/loja-pronta/produtos">Voltar para os produtos</Link>
      </Button>
    </CenteredMemberPage>
  );
}

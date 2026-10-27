import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { getLegacyStoreForUser } from '@/features/legacy-stores/server/queries';
import { recoveredStores } from '@/features/legacy-stores/server/catalog-data';
import { recoveredPublicationEnabled } from '@/features/legacy-stores/server/publication-runtime';
import { canUseShopee } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { hasShopeeConnection } from '@/features/shopee/server/connection';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Continuar minha loja anterior' };

export default async function ContinueStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/loja-pronta/previous-stores/${encodeURIComponent(id)}`;
  const { session, products } = await requireProduct('loja-pronta', `${path}/continue`);
  const saved = await getLegacyStoreForUser(session.user.id, id);
  if (!saved) notFound();
  const sourceId = saved.linked?.id ?? saved.id;
  const recovery = (await recoveredStores(db.$client, session.user.id)).find(
    (row) => row.id === sourceId,
  );
  const config = getShopeeConfiguration();
  const enabled =
    config?.SHOPEE_ENVIRONMENT === 'live' &&
    canUseShopee(config, session.user.id, session.user.role);
  const connected = enabled && config ? await hasShopeeConnection(session.user.id, config) : false;
  const publication = enabled && recoveredPublicationEnabled();
  const catalogPath = `/loja-pronta/produtos/recovered?store=${sourceId}`;

  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      narrow
      title="Continue sua loja anterior"
      intro="Sua loja está salva. Você não precisa refazer o cadastro nem a marca."
    >
      <Button asChild variant="soft" size="inline" className="w-fit px-5">
        <Link href="/loja-pronta">
          <ArrowLeft aria-hidden="true" />
          Voltar às minhas lojas
        </Link>
      </Button>
      <section aria-labelledby="preserved-store" className={`${panelCard} gap-4`}>
        <h2 id="preserved-store" className="text-title font-semibold wrap-anywhere">
          {saved.record.nome || saved.record.shopee_nome || 'Sua loja anterior'}
        </h2>
        <p className="text-body text-muted-foreground">
          Seus dados e {saved.total} produtos salvos estão preservados.
        </p>
        <Button asChild variant="link" size="inline" className="w-fit">
          <Link href={path}>Ver dados salvos da loja</Link>
        </Button>
      </section>
      <section aria-labelledby="continue-products" className={`${panelCard} gap-4`}>
        <h2 id="continue-products" className="text-title font-semibold">
          {recovery?.imported
            ? 'Revise seus produtos'
            : recovery
              ? 'Importe seus produtos antigos'
              : 'Seus produtos continuam salvos'}
        </h2>
        {recovery ? (
          <>
            <p className="text-body text-pretty text-muted-foreground">
              {recovery.available} produtos têm dados recuperados, com fotos e variações.
              {recovery.imported
                ? ` ${recovery.imported} já estão na sua lista para revisão.`
                : ' Escolha os produtos para levar à sua lista de revisão.'}{' '}
              Importar guarda os produtos aqui no sistema; os anúncios ainda precisam da sua
              confirmação.
            </p>
            <Button asChild className="w-fit">
              <Link
                href={
                  recovery.imported
                    ? catalogPath
                    : `/loja-pronta/previous-stores/${sourceId}/import`
                }
              >
                {recovery.imported
                  ? 'Revisar produtos desta loja'
                  : 'Escolher produtos para importar'}
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-body text-pretty text-muted-foreground">
            Os registros antigos estão guardados, mas ainda não há produtos recuperados disponíveis
            para importar desta loja. Você não precisa preencher tudo de novo. Ainda não há uma data
            confirmada para essa liberação.
          </p>
        )}
      </section>
      <section aria-labelledby="store-connection" className={`${panelCard} gap-4`}>
        <h2 id="store-connection" className="text-title font-semibold">
          {connected
            ? 'Sua loja está conectada'
            : enabled
              ? 'Conecte a loja que receberá os produtos'
              : 'Conexão com a Shopee em breve'}
        </h2>
        <p className="text-body text-pretty text-muted-foreground">
          {connected
            ? 'Você já tem uma autorização salva. Antes de publicar cada produto, confira o nome e o número da loja de destino na revisão.'
            : enabled
              ? 'Autorize o aplicativo Escala Shop no site da Shopee. Sua senha fica com você. Antes de publicar, você confere qual loja vai receber os produtos.'
              : 'A conexão ainda não está disponível para esta conta. Seus dados continuam salvos. Volte a esta página para conferir a liberação.'}
        </p>
        {enabled && !connected ? (
          <Button asChild variant="soft" className="w-fit">
            <Link href="/loja-pronta/produtos/recovered/connect">Conectar minha loja</Link>
          </Button>
        ) : null}
      </section>
      <section aria-labelledby="store-delivery" className={`${panelCard} gap-4`}>
        <h2 id="store-delivery" className="text-title font-semibold">
          E a entrega da minha loja?
        </h2>
        <p className="text-body text-pretty text-muted-foreground">
          {publication
            ? 'Depois de importar, abra cada produto para revisar preço, estoque e frete atuais. Confira a loja de destino e confirme a publicação. O andamento aparece na sua lista de produtos.'
            : 'A publicação dos produtos recuperados ainda não está liberada para esta conta. Você pode importar e revisar os produtos disponíveis enquanto aguarda. Ainda não há uma data de entrega confirmada.'}
        </p>
        <p className="text-body text-pretty text-muted-foreground">
          Conectar a Shopee não publica os produtos automaticamente. Só considere a publicação
          concluída quando o sistema confirmar cada anúncio.
        </p>
      </section>
    </AreaPage>
  );
}

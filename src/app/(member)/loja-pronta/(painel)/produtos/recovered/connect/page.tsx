import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { canUseShopee, getShopeeResultMessage } from '@/features/shopee/authorization';
import { ShopeeAuthorizationForm } from '@/features/shopee/components/authorization-form';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { getShopeeStatus } from '@/features/shopee/server/connection';
import { disconnectShopee } from '@/features/shopee/server/actions';
import { ManualConnectionForm } from '@/features/shopee/components/manual-connection-form';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Conectar loja para produtos recuperados' };
export default async function ConnectRecoveredCatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct(
    'loja-pronta',
    '/loja-pronta/produtos/recovered/connect',
  );
  const config = getShopeeConfiguration();
  const enabled = canUseShopee(config, session.user.id, session.user.role);
  const status = config
    ? await getShopeeStatus(session.user.id, config)
    : { connected: false as const, saved: false };
  const connected = enabled && status.connected;
  const result = getParam((await searchParams).resultado);
  const environment = config?.SHOPEE_ENVIRONMENT;
  const sandbox = environment === 'sandbox';
  const message = getShopeeResultMessage(result, connected, environment);
  return (
    <AreaPage
      hasChoice={products.length > 1}
      area="loja-pronta"
      crumb="Conectar minha loja"
      title="Conecte sua loja para publicar"
    >
      <section className={`${panelCard} gap-5`} aria-labelledby="connection-title">
        <h2 id="connection-title" className="text-title font-semibold">
          {connected
            ? sandbox
              ? 'Loja de teste conectada'
              : 'Loja conectada'
            : enabled
              ? 'Autorize sua loja na Shopee'
              : 'Conexão em breve'}
        </h2>
        <p className="text-body text-muted-foreground">
          {connected
            ? `A loja ${status.shopId} está vinculada. Confira o número na Central do Vendedor da Shopee.`
            : sandbox
              ? 'Use uma loja de teste da Shopee para conferir a autorização.'
              : 'Conecte a loja brasileira que receberá seus produtos recuperados. A autorização acontece na Shopee, e sua senha fica com você. Antes de cada publicação, você confere a loja de destino e confirma o envio.'}
        </p>
        {message ? (
          <output className="rounded-2xl bg-primary-soft p-5 text-body">
            {result === 'connected'
              ? 'Sua loja foi conectada. Agora revise os dados de cada produto e confirme a publicação quando estiver disponível para sua conta.'
              : message}
          </output>
        ) : null}
        {status.saved ? (
          <form action={disconnectShopee} className="flex flex-col gap-3">
            <input type="hidden" name="origin" value="recovered" />
            <p id="disconnect-recovered-help" className="text-body text-muted-foreground">
              Para trocar de loja, remova o vínculo e autorize a loja certa. Essa conexão também é
              usada na Loja Pronta e no SLL.
            </p>
            <Button variant="soft" aria-describedby="disconnect-recovered-help">
              Desconectar desta plataforma
            </Button>
          </form>
        ) : null}
        {enabled && !connected ? (
          config?.SHOPEE_CALLBACK_MODE === 'manual' ? (
            <ManualConnectionForm origin="recovered" sandbox={sandbox} />
          ) : (
            <ShopeeAuthorizationForm origin="recovered" sandbox={sandbox} />
          )
        ) : null}
        <Button asChild variant="soft">
          <Link href="/loja-pronta/produtos/recovered">
            {connected && !sandbox
              ? 'Revisar produtos e acompanhar publicação'
              : 'Voltar aos produtos recuperados'}
          </Link>
        </Button>
      </section>
    </AreaPage>
  );
}

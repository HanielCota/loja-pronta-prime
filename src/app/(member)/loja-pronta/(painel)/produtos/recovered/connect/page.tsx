import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AreaPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { canUseShopee, SHOPEE_RESULT_MESSAGES } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { hasShopeeConnection } from '@/features/shopee/server/connection';
import { connectShopee } from '@/features/shopee/server/actions';
import { ManualConnectionForm } from '@/features/shopee/components/manual-connection-form';

export const metadata: Metadata = { title: 'Conectar loja para produtos recuperados' };
export default async function ConnectRecoveredCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { session, products } = await requireProduct(
    'loja-pronta',
    '/loja-pronta/produtos/recovered/connect',
  );
  const config = getShopeeConfiguration();
  const enabled = canUseShopee(config, session.user.id, session.user.role);
  const connected = enabled && config ? await hasShopeeConnection(session.user.id, config) : false;
  const result = (await searchParams).resultado;
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
            ? 'Loja conectada'
            : enabled
              ? 'Autorize sua loja na Shopee'
              : 'Conexão em breve'}
        </h2>
        <p className="text-body text-muted-foreground">
          Conecte a loja brasileira que receberá seus produtos recuperados. A autorização acontece
          na Shopee, e sua senha fica com você. Antes de cada publicação, você confere a loja de
          destino e confirma o envio.
        </p>
        {result && Object.hasOwn(SHOPEE_RESULT_MESSAGES, result) ? (
          <output className="rounded-2xl bg-primary-soft p-5 text-body">
            {result === 'connected'
              ? 'Sua loja foi conectada. Agora revise os dados de cada produto e confirme a publicação quando estiver disponível para sua conta.'
              : SHOPEE_RESULT_MESSAGES[result]}
          </output>
        ) : null}
        {enabled && !connected ? (
          config?.SHOPEE_CALLBACK_MODE === 'manual' ? (
            <ManualConnectionForm origin="recovered" />
          ) : (
            <form action={connectShopee}>
              <input type="hidden" name="origin" value="recovered" />
              <Button>Autorizar na Shopee</Button>
            </form>
          )
        ) : null}
        <Button asChild variant="soft">
          <Link href="/loja-pronta/produtos/recovered">
            {connected
              ? 'Revisar produtos e acompanhar publicação'
              : 'Voltar aos produtos recuperados'}
          </Link>
        </Button>
      </section>
    </AreaPage>
  );
}

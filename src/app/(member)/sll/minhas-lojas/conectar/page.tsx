import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllPage } from '@/features/sll/sll-area-shell';
import { requireProduct } from '@/features/products/server/access';
import { SHOPEE_SELLER_URL } from '@/config/shopee';
import { canUseShopee, SHOPEE_RESULT_MESSAGES } from '@/features/shopee/authorization';
import { ManualConnectionForm } from '@/features/shopee/components/manual-connection-form';
import { connectShopee, disconnectShopee } from '@/features/shopee/server/actions';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { getShopeeStatus } from '@/features/shopee/server/connection';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Conectar minha loja · SLL' };

export default async function SllConnectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct('sll', '/sll/minhas-lojas/conectar');
  const config = getShopeeConfiguration();
  const enabled = canUseShopee(config, session.user.id, session.user.role);
  const status =
    enabled && config
      ? await getShopeeStatus(session.user.id, config)
      : { connected: false as const };
  const result = getParam((await searchParams).resultado);
  const message =
    result && Object.hasOwn(SHOPEE_RESULT_MESSAGES, result) ? SHOPEE_RESULT_MESSAGES[result] : null;
  return (
    <SllPage
      hasChoice={products.length > 1}
      title="Conecte sua loja"
      backLink={{ href: '/sll/minhas-lojas', label: 'Voltar para minhas lojas' }}
    >
      <section className={panelCard} aria-labelledby="seller-registration">
        <h2 id="seller-registration" className="text-title font-semibold">
          Primeiro, o cadastro de vendedora
        </h2>
        <p className="text-body text-muted-foreground">
          Complete seu cadastro na Central do Vendedor da Shopee. Se você já tem loja, pode seguir
          para a autorização abaixo. Esse passo faz parte do SLL e não exige comprar a Loja Pronta.
        </p>
        <Button asChild variant="soft">
          <a href={SHOPEE_SELLER_URL} target="_blank" rel="noreferrer">
            Abrir a Central do Vendedor<span className="sr-only"> (abre em outra aba)</span>
          </a>
        </Button>
      </section>
      <section className={panelCard} aria-labelledby="store-authorization">
        <h2 id="store-authorization" className="text-title font-semibold">
          {status.connected
            ? 'Loja conectada'
            : enabled
              ? 'Autorize o acesso à sua loja'
              : 'Conexão em preparação'}
        </h2>
        <p className="text-body text-muted-foreground">
          {status.connected
            ? `A loja ${status.shopId} está autorizada${config?.SHOPEE_ENVIRONMENT === 'sandbox' ? ' no ambiente de testes' : ''}. Essa conexão é compartilhada com a Loja Pronta quando você tem os dois produtos.`
            : 'A autorização acontece no site da Shopee. Sua senha fica com você. Você confere as permissões e pode revogar o acesso na Central do Vendedor.'}
        </p>
        {message ? <output className="text-body">{message}</output> : null}
        {enabled && !status.connected ? (
          config?.SHOPEE_CALLBACK_MODE === 'manual' ? (
            <ManualConnectionForm origin="sll" />
          ) : (
            <form action={connectShopee}>
              <input type="hidden" name="origin" value="sll" />
              <Button>Autorizar na Shopee</Button>
            </form>
          )
        ) : null}
        {enabled && status.connected ? (
          <form action={disconnectShopee}>
            <input type="hidden" name="origin" value="sll" />
            <p className="mb-3 text-body text-muted-foreground">
              Desconectar remove o acesso à loja nesta plataforma, inclusive na Loja Pronta.
            </p>
            <Button variant="soft">Desconectar desta plataforma</Button>
          </form>
        ) : null}
        {!enabled ? (
          <p className="text-body text-muted-foreground">
            A conexão estará disponível quando a configuração e a validação da integração forem
            concluídas.
          </p>
        ) : null}
        <Button asChild variant="soft">
          <Link href="/sll/plano">Ir para meu plano</Link>
        </Button>
      </section>
    </SllPage>
  );
}

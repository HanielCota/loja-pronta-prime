import { BellIcon, EyeIcon, LockIcon, RefreshCwIcon, type LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { SHOPEE_CONNECT_PATH } from '@/config/shopee';
import { getBrand } from '@/features/brand/server/brand';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { CenteredMemberPage, panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { canUseShopee, SHOPEE_RESULT_MESSAGES } from '@/features/shopee/authorization';
import { ManualConnectionForm } from '@/features/shopee/components/manual-connection-form';
import { connectShopee, disconnectShopee } from '@/features/shopee/server/actions';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { getShopeeStatus } from '@/features/shopee/server/connection';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Conectar a Shopee' };

/** A fase da conexão com a Shopee (ver src/config/store-phases.ts). */
const CONNECT_PHASE = 4;

/** O que ela precisa saber antes de autorizar: a senha, o que a plataforma pode e como desfazer. */
const PROMISES: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: LockIcon,
    title: 'Sua senha',
    text: 'Você digita direto no site da Shopee, nunca aqui. Sua senha fica só com você.',
  },
  {
    Icon: EyeIcon,
    title: 'Permissão',
    text: 'Você confere as permissões no site da Shopee antes de autorizar o aplicativo Escala Shop.',
  },
  {
    Icon: RefreshCwIcon,
    title: 'Pode cancelar',
    text: 'Você pode cortar esse acesso nas configurações da Shopee quando quiser.',
  },
];

/**
 * A mesma moldura explica a autorização e oferece a ação apenas quando o servidor está pronto.
 */
export default async function ShopeeConnectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session } = await requireProduct('loja-pronta', SHOPEE_CONNECT_PATH);
  const [phase, brand] = await Promise.all([
    getStorePhase(session.user.id),
    getBrand(session.user.id),
  ]);
  if (phase < CONNECT_PHASE) redirect('/loja-pronta');
  const config = getShopeeConfiguration();
  const enabled = canUseShopee(config, session.user.id, session.user.role);
  const status =
    enabled && config
      ? await getShopeeStatus(session.user.id, config)
      : { connected: false as const };
  const result = getParam((await searchParams).resultado);
  const message =
    result && Object.hasOwn(SHOPEE_RESULT_MESSAGES, result)
      ? SHOPEE_RESULT_MESSAGES[result]
      : undefined;

  return (
    <CenteredMemberPage
      account={session.user}
      wide
      trail={[
        { href: '/', label: 'Início' },
        { href: '/loja-pronta', label: 'Loja Pronta' },
      ]}
      current="Conectar a Shopee"
    >
      <div className="mx-auto flex w-full max-w-[688px] flex-col gap-6">
        <Logo expression="happy" compact />
        <CardHeading
          className="mb-0"
          title={
            status.connected
              ? config?.SHOPEE_ENVIRONMENT === 'sandbox'
                ? 'Loja de teste conectada'
                : 'Sua loja está conectada à Shopee'
              : enabled
                ? config?.SHOPEE_ENVIRONMENT === 'sandbox'
                  ? 'Conecte uma loja de teste'
                  : 'Conecte sua loja à Shopee'
                : 'Conexão com a Shopee em breve'
          }
          description={
            status.connected
              ? 'A conexão foi autorizada. A escolha dos produtos e a publicação chegam em breve.'
              : enabled
                ? config?.SHOPEE_ENVIRONMENT === 'sandbox'
                  ? 'Este é o ambiente de testes da Shopee. Use apenas a conta da loja de sandbox.'
                  : `Autorize o aplicativo Escala Shop para conectar a ${brand.name ?? 'sua loja'}. Você entra no site da Shopee no próximo passo.`
                : `A ${brand.name ?? 'sua loja'} ainda não está conectada pela plataforma. Veja como a autorização vai funcionar.`
          }
        />
        {message ? <output className="text-body text-pretty">{message}</output> : null}
        <ul className="grid gap-3 sm:grid-cols-3">
          {PROMISES.map(({ Icon, title, text }) => (
            <li key={title} className={cn(panelCard, 'gap-2 p-5 sm:p-5')}>
              <span className="inline-flex items-center gap-2 text-body font-semibold">
                <Icon aria-hidden="true" className="size-5 shrink-0 text-link" />
                {title}
              </span>
              <span className="text-body text-pretty text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>
        <p className="flex gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-body text-pretty text-foreground">
          <BellIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
          <span>
            {enabled
              ? 'Seu nome, logo e texto ficam salvos aqui para'
              : 'A conexão ainda está em preparação. Seu nome, logo e texto ficam salvos aqui para'}{' '}
            a publicação automática, que também está em breve. Por enquanto, a plataforma não
            publica sua marca nem seus produtos por lá.
          </span>
        </p>
        {enabled && !status.connected ? (
          config?.SHOPEE_CALLBACK_MODE === 'manual' ? (
            <ManualConnectionForm />
          ) : (
            <form action={connectShopee}>
              <Button type="submit" className="w-full">
                Autorizar na Shopee
              </Button>
            </form>
          )
        ) : null}
        {enabled && status.connected ? (
          <form action={disconnectShopee}>
            <Button type="submit" variant="soft" className="w-full">
              Desconectar desta plataforma
            </Button>
          </form>
        ) : null}
        <Button asChild variant="soft">
          <Link href="/loja-pronta">Voltar pra Loja Pronta</Link>
        </Button>
      </div>
    </CenteredMemberPage>
  );
}

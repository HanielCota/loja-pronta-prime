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
    text: 'Quando a conexão abrir, você poderá conferir as permissões no site da Shopee antes de autorizar.',
  },
  {
    Icon: RefreshCwIcon,
    title: 'Pode cancelar',
    text: 'Você pode cortar esse acesso nas configurações da Shopee quando quiser.',
  },
];

/**
 * Fase 4: ligar a conta da Shopee à plataforma, pelo site oficial da Shopee. A ligação depende do
 * cadastro de parceiro na Shopee, que ainda não saiu: a tela explica como vai ser e diz, sem
 * rodeio, que o botão abre em breve (nada de botão que finge funcionar).
 */
export default async function ShopeeConnectPage() {
  const { session } = await requireProduct('loja-pronta', SHOPEE_CONNECT_PATH);
  const [phase, brand] = await Promise.all([
    getStorePhase(session.user.id),
    getBrand(session.user.id),
  ]);
  if (phase !== CONNECT_PHASE) redirect('/loja-pronta');

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
          title="Conexão com a Shopee em breve"
          description={`A ${brand.name ?? 'sua loja'} ainda não está conectada pela plataforma. Veja como a autorização vai funcionar.`}
        />
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
            A conexão depende da liberação da Shopee. Seu nome, logo e texto ficam salvos aqui
            para a publicação automática, que também está em breve. Por enquanto, a plataforma
            não publica sua marca nem seus produtos por lá.
          </span>
        </p>
        <Button asChild variant="soft">
          <Link href="/loja-pronta">Voltar pra Loja Pronta</Link>
        </Button>
      </div>
    </CenteredMemberPage>
  );
}

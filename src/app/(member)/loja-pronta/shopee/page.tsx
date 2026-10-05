import { ArrowRightIcon, CheckIcon, ExternalLinkIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { SHOPEE_PATH, SHOPEE_SELLER_URL } from '@/config/shopee';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { displayedPhase } from '@/features/loja-pronta/store-phase';
import {
  CenteredMemberPage,
  panelCard,
  sectionTitleClass,
} from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { confirmShopeeAccount } from '@/features/shopee/server/actions';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Conta na Shopee' };

/** O que ela precisa ter à mão pra abrir a conta (a Shopee pede tudo isso). */
const NEEDS = [
  'CPF e um documento com foto',
  'Um celular, pra receber o código da Shopee',
  'Um e-mail',
  'Os dados da sua conta no banco (é pra onde vai o dinheiro das vendas)',
];

const STEPS = [
  'Toque em "Abrir o cadastro da Shopee" (abre em outra aba).',
  'Toque em "Cadastre-se" e use o seu celular ou e-mail.',
  'Preencha os seus dados de vendedora. A Shopee pode pedir uma foto do documento.',
  'Volte aqui e toque em "Já criei minha conta".',
];

/**
 * Fase 3: ela abre a conta de vendedora na Shopee (é dela, no nome dela). Três momentos, na
 * mesma página: o passo a passo; a pergunta "a Shopee já liberou?"; e, se ainda falta algo, o
 * aviso de terminar o cadastro lá. Liberada, a loja vai pra conexão.
 */
export default async function ShopeeAccountPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ session }, query] = await Promise.all([
    requireProduct('loja-pronta', SHOPEE_PATH),
    searchParams,
  ]);
  const userId = session.user.id;
  const [phase, onboarding] = await Promise.all([getStorePhase(userId), getOnboarding(userId)]);
  if (displayedPhase(phase, Boolean(onboarding.completedAt)) !== 3) redirect('/loja-pronta');
  const moment = getParam(query.etapa);

  return (
    <CenteredMemberPage
      account={session.user}
      trail={[
        { href: '/', label: 'Início' },
        { href: '/loja-pronta', label: 'Loja Pronta' },
      ]}
      current="Conta na Shopee"
    >
      <div className="flex flex-col gap-6">
        <Logo expression="happy" compact />
        {moment === 'conferir' ? <Check /> : moment === 'pendente' ? <Pending /> : <Guide />}
      </div>
    </CenteredMemberPage>
  );
}

/** O link da Central do Vendedor (abre em outra aba: ela volta aqui depois). */
function SellerLink({ children, variant }: { children: ReactNode; variant?: 'soft' }) {
  return (
    <Button asChild variant={variant}>
      <a href={SHOPEE_SELLER_URL} target="_blank" rel="noreferrer">
        {children}
        <ExternalLinkIcon aria-hidden="true" />
        <span className="sr-only"> (abre em outra aba)</span>
      </a>
    </Button>
  );
}

function Guide() {
  return (
    <>
      <CardHeading
        className="mb-0"
        title="Abra sua conta de vendedora na Shopee"
        description="É lá que a sua loja vai ficar. A conta é sua, no seu nome. Leva uns 15 minutos."
      />
      <section aria-labelledby="precisa" className={cn(panelCard, 'gap-3')}>
        <h2 id="precisa" className={sectionTitleClass}>
          Tenha à mão
        </h2>
        <ul className="flex flex-col gap-2">
          {NEEDS.map((item) => (
            <li key={item} className="flex gap-3 text-body text-pretty">
              <CheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-progress" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="como" className={cn(panelCard, 'gap-3')}>
        <h2 id="como" className={sectionTitleClass}>
          Como fazer
        </h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((item, index) => (
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
      <div className="flex flex-col gap-2">
        <SellerLink>Abrir o cadastro da Shopee</SellerLink>
        <Button asChild variant="soft">
          <Link href={`${SHOPEE_PATH}?etapa=conferir`}>
            Já criei minha conta
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </>
  );
}

/** "A Shopee já liberou?": entrando no painel de vendedora, a conta está pronta. */
function Check() {
  return (
    <>
      <CardHeading
        className="mb-0"
        title="A Shopee já liberou a sua conta?"
        description="Você sabe que liberou quando consegue entrar na Central do Vendedor e ver o painel da sua loja."
      />
      <div className="flex flex-col gap-2">
        <form action={confirmShopeeAccount}>
          <Button type="submit">
            Sim, já entro no painel de vendedora
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        </form>
        <Button asChild variant="soft">
          <Link href={`${SHOPEE_PATH}?etapa=pendente`}>Ainda falta terminar o cadastro</Link>
        </Button>
        <Button asChild variant="ghost" className="text-link">
          <Link href={SHOPEE_PATH}>Ver o passo a passo de novo</Link>
        </Button>
      </div>
    </>
  );
}

/** Falta algo no cadastro: ela termina no site da Shopee e volta (sem pressa). */
function Pending() {
  return (
    <>
      <CardHeading
        className="mb-0"
        title="Falta terminar seu cadastro na Shopee"
        description="A Shopee precisa que você complete uns dados no site dela antes da gente continuar. É rapidinho."
      />
      <p className={cn(panelCard, 'text-body text-pretty')}>
        Abra o site da Shopee, complete o que estiver faltando e volte aqui. Se a Shopee pediu uma
        foto do documento, a liberação pode levar até 1 dia.
      </p>
      <div className="flex flex-col gap-2">
        <SellerLink>Abrir o site da Shopee</SellerLink>
        <Button asChild variant="soft">
          <Link href={`${SHOPEE_PATH}?etapa=conferir`}>Já terminei</Link>
        </Button>
        <p className="text-center text-body text-pretty text-muted-foreground">
          Sem pressa: você pode resolver lá e voltar amanhã. A Loja Pronta guarda onde você parou.
        </p>
      </div>
    </>
  );
}

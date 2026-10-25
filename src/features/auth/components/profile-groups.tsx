import {
  ChevronRightIcon,
  ClockAlertIcon,
  GraduationCapIcon,
  LaptopIcon,
  MailIcon,
  MessageCircleIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  StoreIcon,
  TabletIcon,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProductId } from '@/config/products';
import { SUPPORT_EMAIL, TEAM_WHATSAPP } from '@/config/support';
import { whatsappLink } from '@/features/loja-pronta/whatsapp';
import {
  accessValidityLabel,
  isAccessEndingSoon,
  type AccessValidity,
} from '@/features/products/access-validity';
import { PRODUCTS } from '@/features/products/catalog';
import type { DeviceKind } from '@/features/presence/device';
import type { AccountDevice } from '../account-device';
import { RowIcon, RowText, SettingsGroup } from './profile-forms';
import { SignOutOthersRow } from './sign-out-button';

/** Onde a compradora vê as compras, recibos e reembolsos (área de quem compra na Hotmart). */
const HOTMART_PURCHASES_URL = 'https://consumer.hotmart.com/';

const PRODUCT_ICONS: Record<ProductId, LucideIcon> = {
  'loja-pronta': StoreIcon,
  sll: GraduationCapIcon,
};

/**
 * Precisa da sua atenção: como o aviso da conta Apple, no topo e só quando há algo a fazer. Hoje,
 * uma área perto do fim (30 dias ou menos): ela vê antes de perder o acesso, sem precisar abrir
 * a lista. Leva ao suporte, que sabe como continuar; nada de botão de renovar que não existe.
 */
export function AttentionGroup({
  products,
  validity,
  now,
}: {
  products: ProductId[];
  validity: Partial<Record<ProductId, AccessValidity>>;
  now: Date;
}) {
  const ending = products.flatMap((product) => {
    const term = validity[product];
    return term && isAccessEndingSoon(term, now) ? [{ product, term }] : [];
  });
  if (ending.length === 0) return null;
  return (
    <SettingsGroup
      id="perfil-atencao"
      title="Precisa da sua atenção"
      footer="Quando o acesso acaba, a área fecha. Pra continuar, fale com o suporte."
    >
      {ending.map(({ product, term }) => (
        <LinkRow
          key={product}
          href={supportHref(`Oi! Meu acesso à ${PRODUCTS[product].name} está acabando.`)}
          external={Boolean(TEAM_WHATSAPP)}
          icon={<ClockAlertIcon className="text-warning" />}
          label={PRODUCTS[product].title}
          value={<span className="text-warning">{accessValidityLabel(term, now)}</span>}
          action="Ajuda"
          actionLabel={`Falar com o suporte sobre o acesso à ${PRODUCTS[product].name}`}
        />
      ))}
    </SettingsGroup>
  );
}

/** O contato do suporte: o WhatsApp quando configurado, senão o email. */
function supportHref(message: string) {
  if (TEAM_WHATSAPP) return whatsappLink(TEAM_WHATSAPP, message);
  return `mailto:${SUPPORT_EMAIL}`;
}

/**
 * Seus acessos: as áreas que ela comprou, até quando valem e um atalho pra cada uma. Quem é
 * iniciante não sabe que a compra tem prazo; aqui a data fica escrita, sem precisar procurar.
 */
export function AccessGroup({
  products,
  validity,
  now,
}: {
  products: ProductId[];
  validity: Partial<Record<ProductId, AccessValidity>>;
  now: Date;
}) {
  if (products.length === 0) return null;
  return (
    <SettingsGroup
      id="perfil-acessos"
      title="Seus acessos"
      footer="O acesso vem da sua compra na Hotmart. Comprou de novo? A data nova aparece aqui."
    >
      {products.map((product) => (
        <AccessRow key={product} product={product} validity={validity[product]} now={now} />
      ))}
      {/* Recibo, reembolso e forma de pagamento ficam na Hotmart, onde ela comprou. */}
      <LinkRow
        href={HOTMART_PURCHASES_URL}
        external
        icon={<ReceiptTextIcon />}
        label="Compras e recibos"
        value="Ver na Hotmart"
        action="Abrir"
        actionLabel="Ver suas compras e recibos na Hotmart"
      />
    </SettingsGroup>
  );
}

function AccessRow({
  product,
  validity,
  now,
}: {
  product: ProductId;
  validity: AccessValidity | undefined;
  now: Date;
}) {
  const Icon = PRODUCT_ICONS[product];
  const endingSoon = validity ? isAccessEndingSoon(validity, now) : false;
  return (
    <LinkRow
      href={PRODUCTS[product].path}
      icon={<Icon />}
      label={PRODUCTS[product].title}
      // Sem data conhecida, só "Liberado": nunca uma data inventada.
      value={
        validity ? (
          <span className={endingSoon ? 'flex items-center gap-1.5 text-warning' : undefined}>
            {endingSoon ? <ClockAlertIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
            {accessValidityLabel(validity, now)}
          </span>
        ) : (
          'Liberado'
        )
      }
      action="Abrir"
      actionLabel={`Abrir ${PRODUCTS[product].name}`}
    />
  );
}

const DEVICE_ICONS: Record<DeviceKind, LucideIcon> = {
  mobile: SmartphoneIcon,
  tablet: TabletIcon,
  desktop: LaptopIcon,
};

const signedInFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Aparelhos conectados, como na conta Apple: onde a conta está aberta agora. Viu um aparelho que
 * não é dela (um computador emprestado, um celular perdido)? Um toque tira todos menos este.
 */
export function DevicesGroup({
  devices,
  impersonating,
}: {
  devices: AccountDevice[];
  impersonating: boolean;
}) {
  if (devices.length === 0) return null;
  // Em "entrar como" a sessão atual não está na lista: conta só os que não são este.
  const others = devices.filter((device) => !device.current).length;
  return (
    <SettingsGroup
      id="perfil-aparelhos"
      title="Aparelhos conectados"
      footer={
        others > 0
          ? 'Não reconhece algum? Saia dos outros aparelhos e troque a senha.'
          : 'Sua conta só está aberta neste aparelho.'
      }
    >
      {devices.map((device) => (
        <DeviceRow key={device.id} device={device} />
      ))}
      {others > 0 && !impersonating ? <SignOutOthersRow /> : null}
    </SettingsGroup>
  );
}

function DeviceRow({ device }: { device: AccountDevice }) {
  const Icon = DEVICE_ICONS[device.kind];
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 sm:px-6">
      <RowIcon>
        <Icon />
      </RowIcon>
      <RowText
        label={`Entrou em ${signedInFormat.format(device.signedInAt)}`}
        value={device.summary ? `${device.kindLabel} · ${device.summary}` : device.kindLabel}
      />
      {device.current ? (
        <span className="text-sm font-semibold text-progress-text">Este aparelho</span>
      ) : (
        <span aria-hidden="true" />
      )}
    </li>
  );
}

/**
 * Precisa de ajuda?: os caminhos de contato num lugar só, no fim do perfil. O WhatsApp só aparece
 * quando o número está configurado; o email do suporte sempre.
 */
export function HelpGroup() {
  return (
    <SettingsGroup id="perfil-ajuda" title="Precisa de ajuda?">
      {TEAM_WHATSAPP ? (
        <LinkRow
          href={whatsappLink(TEAM_WHATSAPP, 'Oi! Preciso de ajuda com a minha conta.')}
          external
          icon={<MessageCircleIcon />}
          label="WhatsApp do suporte"
          value="Tire suas dúvidas por mensagem"
          action="Chamar"
          actionLabel="Chamar o suporte no WhatsApp"
        />
      ) : null}
      <LinkRow
        href={`mailto:${SUPPORT_EMAIL}`}
        icon={<MailIcon />}
        label="Email do suporte"
        value={SUPPORT_EMAIL}
        action="Escrever"
        actionLabel="Escrever um email pro suporte"
      />
      <LinkRow
        href="/privacidade"
        icon={<ShieldCheckIcon />}
        label="Seus dados"
        value="Política de Privacidade"
        action="Ler"
        actionLabel="Ler a Política de Privacidade"
      />
    </SettingsGroup>
  );
}

/**
 * Linha que leva pra outro lugar, no mesmo desenho das linhas que abrem formulário: a linha inteira
 * é o link (alvo grande no celular), com a ação escrita à direita.
 */
function LinkRow({
  href,
  external = false,
  icon,
  label,
  value,
  action,
  actionLabel,
}: {
  href: string;
  external?: boolean;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  /** O que acontece ("Abrir", "Ler"), visível na linha. */
  action: string;
  /** A ação com o destino, pro leitor de tela ("Abrir SLL"). */
  actionLabel: string;
}) {
  const className =
    'grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 text-left outline-none hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150 sm:px-6';
  const content = (
    <>
      <RowIcon>{icon}</RowIcon>
      <RowText label={label} value={value} />
      <span className="flex items-center gap-1 text-sm font-semibold text-link">
        <span aria-hidden="true">{action}</span>
        <span className="sr-only">
          {actionLabel}
          {external ? ' (abre em outra aba)' : ''}
        </span>
        <ChevronRightIcon aria-hidden="true" className="size-4" />
      </span>
    </>
  );

  if (external) {
    return (
      <li>
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {content}
        </a>
      </li>
    );
  }
  if (href.startsWith('mailto:')) {
    return (
      <li>
        <a href={href} className={className}>
          {content}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={className}>
        {content}
      </Link>
    </li>
  );
}

import { z } from 'zod';
import { SHOPEE_CALLBACK_PATH } from '@/config/shopee';
import { hasControlCharacters } from '@/lib/text';

export const shopeeConfigurationSchema = z.object({
  SHOPEE_PARTNER_ID: z.coerce.number().int().positive().safe(),
  SHOPEE_PARTNER_KEY: z.string().min(1).max(500),
  SHOPEE_TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
  SHOPEE_ENVIRONMENT: z.enum(['live', 'sandbox']).default('live'),
  SHOPEE_ENABLED: z.enum(['true', 'false']).default('false'),
});
export type ShopeeConfiguration = z.infer<typeof shopeeConfigurationSchema>;

export function shopeeApplicationId(config: ShopeeConfiguration) {
  return `${config.SHOPEE_ENVIRONMENT}:${config.SHOPEE_PARTNER_ID}`;
}

export function shopeeTokenOwner(userId: string, shopId: number, config: ShopeeConfiguration) {
  return `shopee:${shopeeApplicationId(config)}:${userId}:${shopId}`;
}

export function shopeeApiOrigin(config: ShopeeConfiguration) {
  return config.SHOPEE_ENVIRONMENT === 'live'
    ? 'https://partner.shopeemobile.com'
    : 'https://openplatform.sandbox.test-stable.shopee.sg';
}

export function buildShopeeAuthorizationUrl(
  config: ShopeeConfiguration,
  applicationUrl: string,
  state: string,
) {
  if (!/^[a-f0-9]{64}$/.test(state)) throw new Error('Autorização inválida.');
  const origin = new URL(applicationUrl);
  if (
    origin.username ||
    origin.password ||
    (origin.protocol !== 'https:' &&
      !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))
  )
    throw new Error('Endereço de retorno inválido.');
  const url = new URL(
    config.SHOPEE_ENVIRONMENT === 'live'
      ? 'https://open.shopee.com.br/auth'
      : 'https://open.test-stable.shopee.com.br/auth',
  );
  url.search = new URLSearchParams({
    partner_id: String(config.SHOPEE_PARTNER_ID),
    auth_type: 'seller',
    redirect_uri: new URL(SHOPEE_CALLBACK_PATH, origin).toString(),
    response_type: 'code',
    state,
  }).toString();
  return url.toString();
}

export function parseShopeeCallback(params: URLSearchParams) {
  for (const name of ['state', 'code', 'shop_id', 'main_account_id', 'error'])
    if (params.getAll(name).length > 1) return null;
  const state = params.get('state');
  if (!state || !/^[a-f0-9]{64}$/.test(state)) return null;
  if (params.has('error')) return { state, kind: 'denied' as const };
  // Conta principal reúne várias lojas; nunca escolher uma loja por inferência.
  if (params.has('main_account_id')) return { state, kind: 'main-account' as const };
  const code = params.get('code');
  const shop = params.get('shop_id');
  if (
    !code ||
    code.length > 2048 ||
    /\s/.test(code) ||
    hasControlCharacters(code) ||
    !shop ||
    !/^[1-9]\d*$/.test(shop) ||
    !Number.isSafeInteger(Number(shop))
  )
    return null;
  return { state, kind: 'authorize' as const, code, shopId: Number(shop) };
}
export type ShopeeCallback = NonNullable<ReturnType<typeof parseShopeeCallback>>;

export const SHOPEE_RESULT_MESSAGES: Record<string, string> = {
  connected: 'Sua loja foi conectada à Shopee. A publicação dos produtos ainda está em breve.',
  sandbox: 'A loja de teste foi conectada. Sua loja real ainda não foi conectada.',
  denied: 'Você não autorizou o acesso. Pode tentar de novo quando quiser.',
  expired: 'Essa autorização venceu ou já foi usada. Comece de novo.',
  failed: 'Não foi possível confirmar a conexão. Comece a autorização de novo.',
  'main-account': 'Entre com a conta da própria loja para autorizar uma loja por vez.',
  'shop-used': 'Essa loja já está vinculada a outra conta na plataforma.',
  unavailable: 'A conexão com a Shopee ainda está em breve.',
  limited: 'Aguarde um minuto antes de tentar novamente.',
  disconnected:
    'A conexão foi removida daqui. Você também pode revogar o Escala Shop na Central do Vendedor.',
};

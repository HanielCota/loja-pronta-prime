import { z } from 'zod';
import { SHOPEE_CALLBACK_PATH } from '@/config/shopee';
import { hasControlCharacters } from '@/lib/text';
import { hasAdminRole } from '@/features/admin/access';

const redirectUriSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    !hasControlCharacters(value)
  );
}, 'Use um endereço HTTPS de retorno, sem parâmetros ou credenciais.');

export const shopeeConfigurationSchema = z
  .object({
    SHOPEE_PARTNER_ID: z.coerce.number().int().positive().safe(),
    SHOPEE_PARTNER_KEY: z.string().min(1).max(500),
    SHOPEE_TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
    SHOPEE_ENVIRONMENT: z.enum(['live', 'sandbox']).default('live'),
    SHOPEE_ENABLED: z.enum(['true', 'false']).default('false'),
    SHOPEE_CALLBACK_MODE: z.enum(['automatic', 'manual']).default('automatic'),
    SHOPEE_REDIRECT_URI: redirectUriSchema.optional(),
    /** Restringe o piloto sem dar acesso administrativo à conta de teste. */
    SHOPEE_PILOT_USER_IDS: z.string().max(2000).default(''),
  })
  .refine(
    (value) => value.SHOPEE_CALLBACK_MODE !== 'manual' || Boolean(value.SHOPEE_REDIRECT_URI),
    {
      path: ['SHOPEE_REDIRECT_URI'],
      message: 'O retorno manual precisa do endereço cadastrado no aplicativo.',
    },
  );
export type ShopeeConfiguration = z.infer<typeof shopeeConfigurationSchema>;

/** O piloto vale também nas actions e no callback, não só na exibição do botão. */
export function canUseShopee(
  config: ShopeeConfiguration | null,
  userId: string,
  role: string | null | undefined,
) {
  if (!config || config.SHOPEE_ENABLED !== 'true') return false;
  const pilot = config.SHOPEE_PILOT_USER_IDS.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const selected = pilot.includes(userId);
  const admin = hasAdminRole(role);
  return (
    (!pilot.length || selected || admin) &&
    (config.SHOPEE_ENVIRONMENT === 'live' || selected || admin)
  );
}

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
  // O Escala Shop usa o cadastro do portal global; o Brasil é escolhido no login.
  const url = new URL(
    config.SHOPEE_ENVIRONMENT === 'live'
      ? 'https://open.shopee.com/auth'
      : 'https://open.sandbox.test-stable.shopee.com/auth',
  );
  url.search = new URLSearchParams({
    partner_id: String(config.SHOPEE_PARTNER_ID),
    auth_type: 'seller',
    redirect_uri: config.SHOPEE_REDIRECT_URI ?? new URL(SHOPEE_CALLBACK_PATH, origin).toString(),
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

/**
 * O retorno manual não faz requisição ao endereço colado. Só aceita o destino exato configurado
 * e reaproveita as mesmas conferências de estado, sessão e uso único do retorno automático.
 */
export function parseManualShopeeCallback(value: string, config: ShopeeConfiguration) {
  if (
    config.SHOPEE_CALLBACK_MODE !== 'manual' ||
    !config.SHOPEE_REDIRECT_URI ||
    value.length > 6000
  )
    return null;
  try {
    const url = new URL(value.trim());
    const expected = new URL(config.SHOPEE_REDIRECT_URI);
    if (
      hasControlCharacters(value) ||
      url.username ||
      url.password ||
      url.hash ||
      url.origin !== expected.origin ||
      url.pathname !== expected.pathname
    )
      return null;
    return parseShopeeCallback(url.searchParams);
  } catch {
    return null;
  }
}

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

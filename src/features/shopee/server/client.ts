import { z } from 'zod';
import { readLimitedBody } from '@/lib/request-body';
import { signShopeeRequest } from '@/lib/shopee-protocol';
import {
  shopeeApiOrigin,
  shopeeConfigurationSchema,
  type ShopeeConfiguration,
} from '../authorization';

export function getShopeeConfiguration() {
  const configured = shopeeConfigurationSchema.safeParse(process.env);
  return configured.success ? configured.data : null;
}

const tokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  // Teto igual ao do Bling: um valor absurdo virava data inválida e a gravação falhava depois de
  // o código de autorização, que só vale uma vez, já ter sido gasto.
  expire_in: z
    .number()
    .int()
    .positive()
    .max(366 * 24 * 60 * 60),
});

export class ShopeeApiError extends Error {
  constructor(public readonly reason: 'configuration' | 'unavailable' | 'rejected' | 'response') {
    super(
      {
        configuration: 'A conexão com a Shopee ainda não está disponível.',
        unavailable: 'Não foi possível falar com a Shopee. Tente novamente mais tarde.',
        rejected: 'A Shopee não aceitou a solicitação. Confira a autorização da loja.',
        response: 'A resposta da Shopee não pôde ser confirmada.',
      }[reason],
    );
    this.name = 'ShopeeApiError';
  }
}

/**
 * Lê o JSON da Shopee contando bytes enquanto chegam. `response.text()` e `response.json()`
 * guardavam a resposta inteira antes de qualquer conferência de tamanho: o tempo tinha teto, a
 * memória não. Qualquer falha (grande demais, texto quebrado) vira resposta inválida.
 */
export async function readShopeeJson(response: Response, maxBytes: number): Promise<unknown> {
  try {
    const bytes = await readLimitedBody(response, maxBytes);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ShopeeApiError('response');
  }
}

/** Preparado para produção. Não faz tentativas automáticas: códigos e refresh tokens são únicos. */
export async function requestShopeeTokens(
  input:
    | { kind: 'authorize'; code: string; shopId: number }
    | { kind: 'refresh'; refreshToken: string; shopId: number },
  fetcher: typeof fetch = fetch,
  configuration?: ShopeeConfiguration,
) {
  const config = configuration ?? getShopeeConfiguration();
  if (!config) throw new ShopeeApiError('configuration');
  if (
    !Number.isSafeInteger(input.shopId) ||
    input.shopId <= 0 ||
    !(input.kind === 'authorize' ? input.code : input.refreshToken)
  )
    throw new ShopeeApiError('rejected');
  const path =
    input.kind === 'authorize' ? '/api/v2/auth/token/get' : '/api/v2/auth/access_token/get';
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(path, shopeeApiOrigin(config));
  url.search = new URLSearchParams({
    partner_id: String(config.SHOPEE_PARTNER_ID),
    timestamp: String(timestamp),
    sign: signShopeeRequest(config.SHOPEE_PARTNER_ID, path, timestamp, config.SHOPEE_PARTNER_KEY),
  }).toString();
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: config.SHOPEE_PARTNER_ID,
        shop_id: input.shopId,
        ...(input.kind === 'authorize'
          ? { code: input.code }
          : { refresh_token: input.refreshToken }),
      }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
      redirect: 'error',
    });
  } catch {
    throw new ShopeeApiError('unavailable');
  }
  if (!response.ok)
    throw new ShopeeApiError(
      response.status >= 500 || response.status === 429 ? 'unavailable' : 'rejected',
    );
  // Tokens cabem em poucos KB.
  const body = await readShopeeJson(response, 64_000);
  if (
    typeof body !== 'object' ||
    body === null ||
    !('error' in body) ||
    typeof body.error !== 'string'
  )
    throw new ShopeeApiError('response');
  if (body.error) throw new ShopeeApiError('rejected');
  const parsed = tokenResponse.safeParse(body);
  if (!parsed.success) throw new ShopeeApiError('response');
  return {
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    expiresAt: new Date(Date.now() + parsed.data.expire_in * 1000),
  };
}

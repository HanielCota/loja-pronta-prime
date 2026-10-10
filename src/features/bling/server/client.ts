import { z } from 'zod';
import { readLimitedBody } from '@/lib/request-body';
import { BLING_API_URL, blingConfigurationSchema, type BlingConfiguration } from '../model';

export function getBlingConfiguration() {
  const result = blingConfigurationSchema.safeParse(process.env);
  return result.success ? result.data : null;
}

export class BlingError extends Error {
  constructor(
    public readonly reason: 'unavailable' | 'authorization' | 'permission' | 'response' | 'company',
  ) {
    super(
      {
        unavailable: 'O Bling está indisponível. Tente novamente mais tarde.',
        authorization: 'Autorize a conta Bling novamente.',
        permission: 'O aplicativo Bling não tem permissão para consultar esses dados.',
        response: 'Não foi possível confirmar a resposta do Bling.',
        company: 'Autorize a conta Bling da empresa configurada.',
      }[reason],
    );
    this.name = 'BlingError';
  }
}

/** Só etapa e motivo conhecido: mensagens externas podem conter códigos e credenciais. */
export function reportBlingFailure(
  stage: 'tokens' | 'company' | 'save' | 'callback',
  error: unknown,
) {
  console.error(
    `[bling] autorização falhou: ${stage}:${error instanceof BlingError ? error.reason : 'unexpected'}`,
  );
}

async function requestJson(url: URL, init: RequestInit, fetcher: typeof fetch) {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new BlingError('unavailable');
  }
  if (!response.ok) {
    if (
      response.status === 401 ||
      (response.status === 400 && url.pathname.endsWith('/oauth/token'))
    )
      throw new BlingError('authorization');
    if (response.status === 403) throw new BlingError('permission');
    throw new BlingError('unavailable');
  }
  try {
    return JSON.parse(
      new TextDecoder().decode(await readLimitedBody(response, 1000000)),
    ) as unknown;
  } catch {
    throw new BlingError('response');
  }
}

const tokensSchema = z.object({
  access_token: z.string().min(1).max(16000),
  refresh_token: z.string().min(1).max(16000),
  // OAuth define token_type sem distinção entre maiúsculas e minúsculas (RFC 6749, 5.1).
  token_type: z.string().regex(/^Bearer$/i),
  expires_in: z
    .number()
    .int()
    .positive()
    .max(366 * 24 * 60 * 60),
});

/** Código e refresh token não são repetidos automaticamente, mesmo se a conexão cair. */
export async function requestBlingTokens(
  config: BlingConfiguration,
  input: { code: string } | { refreshToken: string },
  fetcher: typeof fetch = fetch,
) {
  const body =
    'code' in input
      ? { grant_type: 'authorization_code', code: input.code }
      : { grant_type: 'refresh_token', refresh_token: input.refreshToken };
  const result = await requestJson(
    new URL(`${BLING_API_URL}/oauth/token`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '1.0',
        Authorization: `Basic ${Buffer.from(`${config.BLING_CLIENT_ID}:${config.BLING_CLIENT_SECRET}`).toString('base64')}`,
        'enable-jwt': '1',
      },
      body: new URLSearchParams(body).toString(),
    },
    fetcher,
  );
  const parsed = tokensSchema.safeParse(result);
  if (!parsed.success) throw new BlingError('response');
  return {
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    expiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
  };
}

/** Lista fechada: uma URL enviada pelo navegador não pode receber o token da empresa. */
export async function readBlingResource(
  accessToken: string,
  resource: 'company' | 'channels' | 'products',
  fetcher: typeof fetch = fetch,
) {
  const paths = {
    company: '/empresas/me/dados-basicos',
    channels: '/canais-venda',
    products: '/produtos',
  };
  const url = new URL(`${BLING_API_URL}${paths[resource]}`);
  if (resource === 'channels')
    url.search = new URLSearchParams({
      'tipos[]': 'Shopee',
      situacao: '1',
      pagina: '1',
      limite: '100',
    }).toString();
  if (resource === 'products')
    url.search = new URLSearchParams({
      criterio: '2',
      tipo: 'P',
      pagina: '1',
      limite: '20',
    }).toString();
  return requestJson(
    url,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'enable-jwt': '1',
        Accept: 'application/json',
      },
    },
    fetcher,
  );
}

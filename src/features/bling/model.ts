import { z } from 'zod';
import { hasControlCharacters } from '@/lib/text';

export const BLING_PATH = '/admin/bling';
export const BLING_CALLBACK_PATH = '/api/bling/callback';
export const BLING_AUTHORIZE_URL = 'https://www.bling.com.br/Api/v3/oauth/authorize';
export const BLING_API_URL = 'https://api.bling.com.br/Api/v3';

export const blingConfigurationSchema = z.object({
  BLING_CLIENT_ID: z.string().trim().min(1).max(200),
  BLING_CLIENT_SECRET: z.string().min(1).max(500),
  BLING_TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
  BLING_EXPECTED_CNPJ: z
    .string()
    .transform((value) => value.replace(/[./-]/g, ''))
    .pipe(z.string().regex(/^\d{14}$/)),
  BLING_ENABLED: z.literal('true'),
});
export type BlingConfiguration = z.infer<typeof blingConfigurationSchema>;

export function parseBlingCallback(params: URLSearchParams) {
  for (const name of ['state', 'code', 'error']) if (params.getAll(name).length > 1) return null;
  const state = params.get('state');
  if (!state || !/^[a-f0-9]{64}$/.test(state)) return null;
  if (params.has('error')) return { state, denied: true as const };
  const code = params.get('code');
  if (!code || code.length > 2048 || /\s/.test(code) || hasControlCharacters(code)) return null;
  return { state, denied: false as const, code };
}

export function buildBlingAuthorizationUrl(clientId: string, state: string) {
  if (!clientId || !/^[a-f0-9]{64}$/.test(state)) throw new Error('Autorização inválida.');
  const url = new URL(BLING_AUTHORIZE_URL);
  // O Bling usa o callback e os escopos registrados no aplicativo, sem aceitar substitutos na URL.
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    state,
  }).toString();
  return url.toString();
}

export const blingCompanySchema = z.object({
  data: z.object({
    id: z.string().min(1).max(200),
    nome: z.string().min(1).max(300),
    cnpj: z
      .string()
      .transform((value) => value.replace(/[./-]/g, ''))
      .pipe(z.string().regex(/^\d{14}$/)),
  }),
});
export const blingChannelsSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.number().int().positive().safe(),
        descricao: z.string().max(300),
        tipo: z.string(),
        situacao: z.number().int(),
      }),
    )
    .max(100),
});
export const blingProductsSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.number().int().positive().safe(),
        nome: z.string().min(1).max(500),
        codigo: z.string().max(200).optional(),
        preco: z.number().finite().min(0).optional(),
      }),
    )
    .max(100),
});

export const BLING_RESULT_MESSAGES: Record<string, string> = {
  connected: 'A conta Bling foi conectada. A publicação automática ainda está em breve.',
  denied: 'Você não autorizou o acesso. Pode tentar novamente quando quiser.',
  expired: 'Essa autorização venceu ou já foi usada. Comece de novo.',
  failed: 'Não foi possível confirmar a conexão. Comece a autorização de novo.',
  company: 'A conta Bling autorizada pertence a outra empresa. Entre na conta da MSL.',
  unavailable: 'A conexão com o Bling ainda está em breve.',
  limited: 'Aguarde um minuto antes de tentar novamente.',
  disconnected:
    'A conexão foi removida desta plataforma. Você também pode revogar o aplicativo no Bling.',
};

import { z } from 'zod';
import { trustedProxyHopsSchema } from './trusted-proxy-hops';

const isSecureOrigin = (url: string) => {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
};

/** Variáveis de infraestrutura, validadas uma vez. Só podem ser usadas no servidor. */
const envSchema = z
  .object({
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z
      .url()
      // Em produção, só https: o cookie de sessão só ganha a marca "Secure" com https.
      // Exceção: localhost (testar o build de produção na própria máquina).
      .refine((url) => process.env.NODE_ENV !== 'production' || isSecureOrigin(url), {
        error: 'em produção, BETTER_AUTH_URL precisa ser https://',
      }),
    /**
     * Quantos proxies confiáveis ficam na frente do sistema (cada um acrescenta um IP ao
     * X-Forwarded-For). 1: atrás de um proxy (o comum em hospedagem). 0: exposto direto, sem
     * proxy: o cabeçalho viria do próprio cliente, então o limite por IP é desligado em vez de
     * confiar num valor que o atacante inventa.
     *
     * Em produção é obrigatória: um 1 suposto, sem proxy na frente, deixaria trocar de IP a cada
     * tentativa e fugir dos limites. Fora dela, 1 (o Next preenche o cabeçalho no dev).
     */
    TRUSTED_PROXY_HOPS: trustedProxyHopsSchema(process.env.NODE_ENV === 'production'),
    /** Imagem do logo e transcrição (OpenAI). Sem chave, o microfone fica "em breve". */
    OPENAI_API_KEY: z.string().min(1).optional(),
    /** Resend: chave só de envio e endereço de um domínio verificado. */
    RESEND_API_KEY: z.string().startsWith('re_').min(4).optional(),
    EMAIL_FROM: z.email().optional(),
    /** Opcional: use apenas uma caixa real, acompanhada pelo suporte. */
    EMAIL_REPLY_TO: z.email().optional(),
    /**
     * Donos da plataforma: e-mails separados por vírgula. Só eles (com o e-mail verificado)
     * convidam, mudam o cargo ou bloqueiam pessoas da equipe. Vazio: ninguém mexe na equipe.
     */
    PLATFORM_OWNER_EMAILS: z.string().default(''),
    /** Os arquivos (o logo gerado) ficam sempre no bucket S3, em dev e em produção. */
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    // Uma configuração pela metade não pode passar como envio pronto.
    if (Boolean(value.RESEND_API_KEY) !== Boolean(value.EMAIL_FROM)) {
      ctx.addIssue({
        code: 'custom',
        path: [value.RESEND_API_KEY ? 'EMAIL_FROM' : 'RESEND_API_KEY'],
        message: 'Configure RESEND_API_KEY e EMAIL_FROM juntos.',
      });
    }
  });

type Env = z.infer<typeof envSchema>;

/**
 * Durante o `next build` as variáveis podem não existir (ex.: build de imagem Docker ou CI).
 * Nessa fase nada atende requisições nem conecta no banco, então valores de mentira bastam.
 */
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const BUILD_PLACEHOLDERS: Env = {
  DATABASE_URL: 'postgres://build:build@localhost:5432/build',
  BETTER_AUTH_SECRET: 'valor-de-build-nunca-usado-em-requisicoes',
  BETTER_AUTH_URL: 'http://localhost:3000',
  TRUSTED_PROXY_HOPS: 1,
  S3_BUCKET: 'build',
  S3_ACCESS_KEY_ID: 'build',
  S3_SECRET_ACCESS_KEY: 'build',
  S3_REGION: 'us-east-1',
  S3_FORCE_PATH_STYLE: 'false',
  PLATFORM_OWNER_EMAILS: '',
};

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  if (isBuild) return BUILD_PLACEHOLDERS;

  // Lista só os nomes das variáveis: os valores podem ser segredos.
  const invalid = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Variáveis de ambiente ausentes ou inválidas: ${invalid}. Veja .env.example.`);
}

export const env = loadEnv();

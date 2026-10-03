import { z } from 'zod';

const isSecureOrigin = (url: string) => {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
};

/** Variáveis de infraestrutura, validadas uma vez. Só podem ser usadas no servidor. */
const envSchema = z.object({
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
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  /** Chat do logo (DeepSeek). Sem a chave, o chat responde que está fora do ar. */
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  /** Imagem do logo (OpenAI). Sem a chave, gerar o logo responde que está fora do ar. */
  OPENAI_API_KEY: z.string().min(1).optional(),
  /**
   * "1": o chat e a imagem respondem de mentira, sem chamar ninguém (testes e2e: sem custo, sem
   * depender da internet). Nunca em produção.
   */
  AI_FAKE: z
    .enum(['0', '1'])
    .default('0')
    .refine((value) => value === '0' || process.env.NODE_ENV !== 'production', {
      error: 'AI_FAKE não pode ser ligado em produção',
    }),
  /**
   * Onde os arquivos ficam: "s3" (o bucket) ou "local" (uma pasta do projeto, só fora de
   * produção). Sem dizer: s3 quando o bucket está configurado, senão local.
   */
  STORAGE_DRIVER: z.enum(['s3', 'local']).optional(),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
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
  AI_FAKE: '0',
  S3_REGION: 'us-east-1',
  S3_FORCE_PATH_STYLE: 'false',
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

import { z } from 'zod';

/** Variáveis de infraestrutura, validadas uma vez. Só podem ser usadas no servidor. */
const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
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

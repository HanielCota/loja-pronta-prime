import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Cada execução começa sem catálogo e sem contas. O banco da aluna nunca é limpo pelos testes.
const mode = process.argv[2];
if (mode !== 'e2e' && mode !== 'integration') throw new Error('Escolha e2e ou integration.');
const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname))
  throw new Error('Os testes isolados precisam do Postgres local (bun run db:up).');

const databaseName = `loja_pronta_test_${randomBytes(8).toString('hex')}`;
const admin = new Pool({ connectionString: databaseUrl.toString() });
let created = false;
let child: ReturnType<typeof Bun.spawn> | undefined;
const stop = () => child?.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
let exitCode = 1;
try {
  // O identificador é gerado aqui, só com prefixo fixo e hexadecimal.
  await admin.query(`create database "${databaseName}"`);
  created = true;
  databaseUrl.pathname = `/${databaseName}`;
  const pool = new Pool({ connectionString: databaseUrl.toString() });
  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }

  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Porta de teste indisponível.');
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  const baseURL = `http://127.0.0.1:${port}`;
  child = Bun.spawn(
    mode === 'e2e'
      ? ['node', 'node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(3)]
      : // Cada arquivo encerra seus pools: isolar também os módulos evita reaproveitar um pool fechado.
        [process.execPath, 'test', '--isolate', 'tests/integration', ...process.argv.slice(3)],
    {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl.toString(),
        E2E_BASE_URL: baseURL,
        BETTER_AUTH_URL: baseURL,
        PORT: String(port),
        // Simula um proxy local para testar também os limites por IP com endereços distintos.
        TRUSTED_PROXY_HOPS: '1',
        // Os testes usam emails inventados: nada de enviar de verdade, mesmo com o Resend no
        // .env.local. O link fica só no terminal (e o token, no banco, onde os testes leem).
        EMAIL_DELIVERY: 'log',
      },
    },
  );
  exitCode = await child.exited;
} finally {
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
  if (created) await admin.query(`drop database "${databaseName}" with (force)`);
  await admin.end();
}
process.exitCode = exitCode;

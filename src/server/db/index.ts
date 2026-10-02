import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/config/env';
import * as schema from './schema';

function createPool(): Pool {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Sem banco, a requisição falha em segundos em vez de ficar pendurada pra sempre.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    // As colunas de data não têm fuso: tudo em UTC, seja qual for o fuso do servidor do banco.
    // Sem isso, os padrões do banco (now()) e as datas gravadas pelo app (UTC) podiam divergir.
    options: '-c timezone=UTC',
  });
  // Uma conexão ociosa que cai (banco reiniciado, rede) emite "error". Sem ouvinte, o Node
  // derrubaria o servidor inteiro; com ele, o pool só descarta a conexão e abre outra.
  pool.on('error', (error) => console.error(`[db] conexão ociosa falhou: ${error.name}`));
  return pool;
}

// Reaproveita o pool entre recarregamentos do dev server.
const globalForDb = globalThis as unknown as { pgPool?: Pool };
const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });

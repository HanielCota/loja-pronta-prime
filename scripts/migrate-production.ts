import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function applyMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida.');

  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    // Mantém a tabela drizzle.__drizzle_migrations usada pelo CLI e só aplica SQL pendente.
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
    console.log('Migrações aplicadas com sucesso.');
  } finally {
    await pool.end();
  }
}

// Um erro termina o processo com falha: o comando de início não deve abrir o servidor sem migrar.
applyMigrations().catch((error: unknown) => {
  console.error(
    'Falha nas migrações:',
    error instanceof Error ? error.message : 'Erro inesperado.',
  );
  process.exitCode = 1;
});

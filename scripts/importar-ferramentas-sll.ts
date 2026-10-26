/**
 * Aplica no banco local a mesma entrega de ferramentas que o deploy aplica em produção
 * (simulador de descontos, calculadora de anúncios e materiais). Sem ela, o Painel local
 * mostra menos atalhos que o site oficial.
 */
import { Pool } from 'pg';
import { importSllTools } from '../src/features/sll/tools/server/import-tools';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida.');

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const tools = await importSllTools(pool);
    console.log(
      `Ferramentas SLL: ${tools.applied ? 'entrega aplicada' : 'entrega já aplicada'}, ${tools.resources} recursos e ${tools.links} ligações.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Falha ao importar:', error instanceof Error ? error.message : 'Erro inesperado.');
  process.exitCode = 1;
});

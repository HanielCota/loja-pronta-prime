import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { Client } from 'pg';
import { env } from '@/config/env';
import { db } from '@/server/db';
import { session } from '@/server/db/schema';
import { recordVisitStep } from './visit-log';

/**
 * Uma entrada por vez para cada pessoa da equipe. Sem isso, um clique duplo em "Entrar" abria duas
 * visitas e uma ficava esquecida (aberta e sem saída no registro). A trava é do Postgres, então
 * vale entre instâncias do servidor; uma conexão própria segura a trava sem ocupar o pool, que as
 * chamadas do Better Auth usam lá dentro.
 */
export async function withStaffVisitLock<Result>(
  staffId: string,
  run: () => Promise<Result>,
): Promise<Result> {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    // Uma trava presa não segura a pessoa pra sempre: em 10 s a entrada falha com erro.
    options: '-c lock_timeout=10000',
  });
  await client.connect();
  try {
    await client.query('select pg_advisory_lock(hashtext($1))', [`support-visit:${staffId}`]);
    return await run();
  } finally {
    // Fechar a conexão solta a trava, mesmo se o desbloqueio explícito não acontecer.
    await client.end().catch((error: unknown) =>
      console.error('[support] não foi possível fechar a trava da visita.', {
        error: error instanceof Error ? error.message : 'desconhecido',
      }),
    );
  }
}

/**
 * Encerra as visitas ainda abertas desta pessoa antes de abrir outra: a de um clique duplo ou a de
 * uma aba fechada sem "Voltar ao painel". Cada uma vai pro registro como saída.
 */
export async function closeOpenVisits(staffId: string): Promise<void> {
  const open = await db
    .delete(session)
    .where(
      and(
        isNotNull(session.impersonatedBy),
        eq(session.impersonatedBy, staffId),
        gt(session.expiresAt, new Date()),
      ),
    )
    .returning({ id: session.id, studentId: session.userId });
  for (const visit of open) {
    await recordVisitStep({
      kind: 'ended',
      sessionId: visit.id,
      staffId,
      studentId: visit.studentId,
      action: 'nova visita',
    });
  }
}

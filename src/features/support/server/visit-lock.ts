import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
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
  // Sem ouvinte, uma conexão que cai (banco reiniciado) derrubaria o servidor inteiro.
  client.on('error', (error) =>
    console.error('[support] a conexão da trava da visita caiu.', { error: error.message }),
  );
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
 * uma aba fechada sem "Voltar ao painel". Cada uma vai pro registro como saída. As que já venceram
 * sozinhas (a sessão sumiu ou passou da validade) ganham a saída "expirou", pra nenhuma entrada
 * ficar sem fim no registro.
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
  await db.execute(sql`
    insert into support_impersonation_log (kind, session_id, staff_id, student_id, action)
    select 'ended', started.session_id, started.staff_id, started.student_id, 'expirou'
    from support_impersonation_log started
    where started.kind = 'started'
      and started.staff_id = ${staffId}
      and started.session_id is not null
      and not exists (
        select 1 from support_impersonation_log ended
        where ended.kind = 'ended' and ended.session_id = started.session_id
      )
      and not exists (
        select 1 from session
        where session.id = started.session_id and session.expires_at > now()
      )
    on conflict do nothing
  `);
}

import { lt } from 'drizzle-orm';
import { db } from '@/server/db';
import { session, verification } from '@/server/db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Apaga sessões e códigos de verificação vencidos há mais de uma semana. Nenhuma tela mostra
 * sessão vencida (os aparelhos conectados só listam as válidas), mas cada login e cada "entrar
 * como aluna" cria uma linha nova, e sem limpeza as tabelas só crescem.
 */
export async function pruneExpiredAuthRows(now = new Date()): Promise<void> {
  const limit = new Date(now.getTime() - 7 * DAY_MS);
  await db.delete(session).where(lt(session.expiresAt, limit));
  await db.delete(verification).where(lt(verification.expiresAt, limit));
}

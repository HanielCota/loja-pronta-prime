import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { session } from '@/server/db/schema';
import { reportAuthError } from './report-error';

/**
 * Encerra as outras sessões da aluna (outros aparelhos), deixando a de agora: depois de trocar
 * a senha, quem sabia a antiga perde o acesso. Uma instrução só. Se falhar, a senha já foi
 * trocada: o erro vai pro log e quem chama segue normalmente (não é motivo pra dizer que a troca
 * deu errado).
 */
export async function revokeOtherSessions(userId: string, keepToken: string): Promise<void> {
  try {
    await db.delete(session).where(and(eq(session.userId, userId), ne(session.token, keepToken)));
  } catch (error) {
    reportAuthError('encerrar as outras sessões depois da troca de senha', error);
  }
}

'use server';

import { parseWithZod } from '@conform-to/zod/v4';
import { and, eq, ne } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { reportAuthError } from '@/server/auth/report-error';
import { db } from '@/server/db';
import { account, session as sessions, user } from '@/server/db/schema';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { staffLandingPath } from '@/features/support/server/staff-landing';
import { firstPasswordSchema } from '../schemas';
import { resolvePostLoginPath } from './post-login';
import { getActiveSession, needsFirstPassword } from './session';
import { HIDDEN_FIELDS, reject, type FormResult } from './submission';

export type FirstAccessResult = { submission?: FormResult; redirectTo?: string } | undefined;

/**
 * Primeiro acesso: a aluna (já logada com a senha temporária) cria a própria senha.
 * Não pede a senha atual: ela acabou de digitá-la no login, e a sessão prova isso.
 *
 * Só vale enquanto a conta ainda está com a senha temporária. Uma Server Action pode ser chamada
 * direto (não só pela página), então a regra fica aqui: sem ela, qualquer sessão aberta trocaria
 * a senha sem saber a atual.
 */
export async function createFirstPassword(
  _state: FirstAccessResult,
  formData: FormData,
): Promise<FirstAccessResult> {
  const submission = parseWithZod(formData, { schema: firstPasswordSchema });
  if (submission.status !== 'success') {
    return { submission: submission.reply({ hideFields: HIDDEN_FIELDS }) };
  }

  const { password, next } = submission.value;
  // Equipe convidada entra pelo painel do cargo; aluna, no início (ver `staffLandingPath`).
  const landingFor = async (person: {
    id: string;
    role?: string | null | undefined;
  }): Promise<string> =>
    resolvePostLoginPath(next, { staffPanelPath: await staffLandingPath(person) });
  // Com JavaScript: a tela comemora e depois navega. Sem: redireciona direto.
  const finish = (destination: string): FirstAccessResult => {
    if (formData.get(ENHANCED_SUBMIT_FIELD)) return { redirectTo: destination };
    redirect(destination);
  };

  let session: Awaited<ReturnType<typeof getActiveSession>>;
  try {
    session = await getActiveSession();
  } catch (error) {
    reportAuthError('leitura da sessão no primeiro acesso', error);
    return { submission: reject(submission, 'unknown') };
  }
  if (!session) return { submission: reject(submission, 'session_expired') };

  const userId = session.user.id;
  if (!(await consumeAttempt('firstPasswordPerUser', userId))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  const credential = and(eq(account.userId, userId), eq(account.providerId, 'credential'));
  /**
   * Já criou a senha (clique duplo, ou outra aba acabou de criar): se é a mesma que ela digitou,
   * segue em frente; se é outra, avisa. Seguir calado faria o navegador guardar a senha que não
   * foi salva, e o próximo login falharia.
   */
  const alreadyCreated = async (): Promise<FirstAccessResult> => {
    let same: boolean;
    try {
      const context = await auth.$context;
      const [stored] = await db
        .select({ password: account.password })
        .from(account)
        .where(credential);
      same = stored?.password
        ? await context.password.verify({ hash: stored.password, password })
        : false;
    } catch (error) {
      reportAuthError('primeiro acesso já concluído', error);
      return { submission: reject(submission, 'unknown') };
    }
    // Fora do try: o redirect do Next funciona lançando uma exceção.
    return same
      ? finish(await landingFor(session.user))
      : { submission: reject(submission, 'first_password_already_set') };
  };

  if (!needsFirstPassword(session.user)) return alreadyCreated();

  let outcome: 'changed' | 'already-done' | 'same-password';
  try {
    const context = await auth.$context;
    // As contas lentas (conferir e gerar a senha) ficam fora da transação: não seguram a linha
    // travada nem uma conexão do banco enquanto calculam.
    const [stored] = await db
      .select({ password: account.password })
      .from(account)
      .where(credential);
    // Sem senha guardada não há o que trocar: tirar a marca de "senha temporária" deixaria uma
    // conta sem senha que pula o primeiro acesso.
    if (!stored?.password) throw new Error('Conta sem senha guardada no primeiro acesso');
    const typedStored = await context.password.verify({ hash: stored.password, password });
    const newHash = typedStored ? null : await context.password.hash(password);

    // Na transação, com a linha da aluna travada: dois envios ao mesmo tempo (clique duplo, outra
    // aba) não se atropelam, e senha e marca mudam juntas ou nenhuma muda.
    outcome = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ mustChangePassword: user.mustChangePassword })
        .from(user)
        .where(eq(user.id, userId))
        .for('update');
      if (!current || !needsFirstPassword(current)) return 'already-done';
      // Igual à guardada, e ela ainda é a temporária: precisa ser outra.
      if (!newHash) return 'same-password';

      const now = new Date();
      await tx.update(account).set({ password: newHash, updatedAt: now }).where(credential);
      await tx
        .update(user)
        .set({ mustChangePassword: false, updatedAt: now })
        .where(eq(user.id, userId));
      // Senha, marca e revogação precisam terminar juntas: a senha temporária veio por email.
      await tx
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), ne(sessions.token, session.session.token)));
      return 'changed';
    });
  } catch (error) {
    reportAuthError('criação da senha no primeiro acesso', error);
    return { submission: reject(submission, 'unknown') };
  }

  if (outcome === 'same-password') return { submission: reject(submission, 'same_password') };
  if (outcome === 'already-done') return alreadyCreated();
  return finish(await landingFor(session.user));
}

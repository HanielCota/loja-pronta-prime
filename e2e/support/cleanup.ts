import { storage } from '@/server/storage';
import { database } from './students';

/** Hosts em que os testes podem mexer à vontade (o Postgres do docker-compose). */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Os testes apagam a tabela de limites inteira e criam dezenas de contas com a mesma senha: só
 * num banco local. Um `.env.local` apontando pra produção não pode zerar a proteção de login de
 * todo mundo. `E2E_ALLOW_DB=1` libera outro host de propósito (um banco de teste remoto).
 */
export function assertTestDatabase() {
  if (process.env.E2E_ALLOW_DB === '1') return;
  const url = process.env.DATABASE_URL;
  const host = url ? new URL(url).hostname : '';
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Os e2e só rodam com o banco local (DATABASE_URL aponta pra "${host}"). ` +
        'Se esse banco é mesmo de teste, use E2E_ALLOW_DB=1.',
    );
  }
}

/**
 * Remove as alunas de teste que batem com o filtro (sessões e contas saem em cascata) e os logos
 * delas no bucket (os de exemplo e os que a IA criou nos testes).
 */
export async function removeStudents(where: string, params: unknown[]) {
  const db = database();
  const { rows } = await db.query<{ id: string }>(`select id from "user" where ${where}`, params);
  if (!rows.length) return;
  const ids = rows.map(({ id }) => id);
  await Promise.all(ids.map((id) => storage().removeAll(`logos/${id.replace(/[^\w-]/g, '')}/`)));
  await db.query(`delete from verification where value = any($1)`, [ids]);
  await db.query(`delete from "user" where id = any($1)`, [ids]);
}

/** As alunas desta execução. */
export const RUN_FILTER = 'email like $1';
export const runPattern = (id: string) => `e2e-${id}-%@teste.com`;

/**
 * Sobras de execuções que não chegaram ao teardown (setup que falhou no meio, execução
 * interrompida). Só as de mais de 1 hora: outra execução pode estar rodando agora.
 */
export function removeStaleStudents() {
  return removeStudents(
    `email like 'e2e-%@teste.com' and created_at < now() - interval '1 hour'`,
    [],
  );
}

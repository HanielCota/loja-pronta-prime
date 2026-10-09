import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
afterAll(() => pool.end());

test('a migração impede vincular a mesma loja a duas contas e remove tokens ao excluir a dona', async () => {
  const connection = await pool.connect();
  const first = randomUUID();
  const second = randomUUID();
  try {
    await connection.query('begin');
    for (const id of [first, second])
      await connection.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
        id,
        'Teste Shopee',
        `${id}@example.invalid`,
      ]);
    const insert =
      'insert into shopee_connections (user_id, shop_id, access_token_encrypted, refresh_token_encrypted, access_token_expires_at) values ($1, $2, $3, $4, now())';
    await connection.query(insert, [first, 987654321, 'encrypted-test', 'encrypted-test']);
    await connection.query('savepoint duplicate_shop');
    await expect(
      connection.query(insert, [second, 987654321, 'encrypted-test', 'encrypted-test']),
    ).rejects.toMatchObject({ code: '23505' });
    await connection.query('rollback to savepoint duplicate_shop');
    await connection.query('delete from "user" where id = $1', [first]);
    const { rows } = await connection.query(
      'select user_id from shopee_connections where user_id = $1',
      [first],
    );
    expect(rows).toHaveLength(0);
  } finally {
    await connection.query('rollback');
    connection.release();
  }
});

test('o estado de autorização só pode ser consumido uma vez e pela mesma sessão', async () => {
  const connection = await pool.connect();
  const id = randomUUID();
  const hash = 'ab'.repeat(32);
  try {
    await connection.query('begin');
    await connection.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
      id,
      'Teste Shopee',
      `${id}@example.invalid`,
    ]);
    await connection.query(
      "insert into shopee_authorization_states (state_hash, user_id, session_id, expires_at) values ($1, $2, $3, now() + interval '10 minutes')",
      [hash, id, 'test-session'],
    );
    const consume =
      'update shopee_authorization_states set consumed_at = now() where state_hash = $1 and user_id = $2 and session_id = $3 and consumed_at is null and expires_at > now() returning state_hash';
    expect((await connection.query(consume, [hash, id, 'wrong-session'])).rowCount).toBe(0);
    expect((await connection.query(consume, [hash, id, 'test-session'])).rowCount).toBe(1);
    expect((await connection.query(consume, [hash, id, 'test-session'])).rowCount).toBe(0);
  } finally {
    await connection.query('rollback');
    connection.release();
  }
});

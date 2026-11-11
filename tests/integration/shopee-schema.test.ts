import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { rejection } from '../support/rejection';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
afterAll(() => pool.end());

test('the connection scope migration preserves existing encrypted production tokens', async () => {
  const connection = await pool.connect();
  try {
    await connection.query('begin');
    await connection.query('create schema shopee_migration_check');
    await connection.query('set local search_path to shopee_migration_check, public');
    await connection.query(`
      create table shopee_connections (
        user_id text primary key, shop_id bigint not null, application_id text not null,
        access_token_encrypted text not null, refresh_token_encrypted text not null
      );
      create unique index shopee_connections_shop_unique on shopee_connections (shop_id);
      insert into shopee_connections values ('owner', 456, 'live:123', 'existing-access', 'existing-refresh');
    `);
    await connection.query(await readFile('drizzle/0080_shopee-connection-scope.sql', 'utf8'));
    await connection.query(
      'insert into shopee_connections (user_id, shop_id, application_id, access_token_encrypted, refresh_token_encrypted) values ($1, $2, $3, $4, $5)',
      ['owner', 456, 'sandbox:123', 'test-access', 'test-refresh'],
    );
    const { rows } = await connection.query(
      'select * from shopee_connections order by application_id',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      application_id: 'live:123',
      access_token_encrypted: 'existing-access',
      refresh_token_encrypted: 'existing-refresh',
    });
    expect(rows[0]?.authorization_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows[0]?.authorization_id).not.toBe(rows[1]?.authorization_id);
  } finally {
    await connection.query('rollback');
    connection.release();
  }
});

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
    expect(
      await rejection(
        connection.query(insert, [second, 987654321, 'encrypted-test', 'encrypted-test']),
      ),
    ).toMatchObject({ code: '23505' });
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

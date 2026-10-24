import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { storage } from '@/server/storage';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { expectNoA11yViolations, signIn } from './support/auth';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD, studentEmail } from './support/students';

const trackId = randomUUID();
const stageId = randomUUID();
const moduleId = randomUUID();
const lessonId = randomUUID();
const slug = `cache-${trackId}`;
const title = `Curso em cache ${trackId}`;
const changedTitle = `Curso atualizado ${trackId}`;
const coverKey = `sll/course-covers/${trackId}/cache-first.webp`;
const nextCoverKey = `sll/course-covers/${trackId}/cache-second.webp`;
let adminEmail: string;
let firstEmail: string;
let secondEmail: string;
let firstId: string;

test.beforeAll(async () => {
  assertTestDatabase();
  for (const kind of ['cache-admin', 'cache-first', 'cache-second']) {
    const email = studentEmail(kind);
    const { user } = await auth.api.createUser({
      body: {
        email,
        password: PASSWORD,
        name: kind,
        role: kind === 'cache-admin' ? 'admin' : 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    if (kind === 'cache-admin') {
      adminEmail = email;
      continue;
    }
    await database().query("insert into student_products (user_id, product) values ($1, 'sll')", [
      user.id,
    ]);
    if (kind === 'cache-first') {
      firstId = user.id;
      firstEmail = email;
      continue;
    }
    secondEmail = email;
  }
  const image = await sharp({
    create: { width: 32, height: 18, channels: 3, background: '#452e9a' },
  })
    .webp()
    .toBuffer();
  await storage().put(coverKey, image, 'image/webp');
  await storage().put(nextCoverKey, image, 'image/webp');
  await database().query(
    "insert into learning_tracks (id, kind, slug, title, status, cover_storage_key, cover_alt) values ($1, 'complementary_course', $2, $3, 'published', $4, 'Capa do teste de cache')",
    [trackId, slug, title, coverKey],
  );
  await database().query(
    "insert into learning_stages (id, track_id, slug, title, status) values ($1, $2, 'aulas', 'Aulas', 'published')",
    [stageId, trackId],
  );
  await database().query(
    "insert into learning_modules (id, stage_id, slug, title, status) values ($1, $2, 'aulas', 'Aulas', 'published')",
    [moduleId, stageId],
  );
  await database().query(
    "insert into learning_lessons (id, module_id, slug, title, status) values ($1, $2, 'aula', 'Aula do cache', 'published')",
    [lessonId, moduleId],
  );
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=$1', [trackId]);
  await Promise.all([storage().remove(coverKey), storage().remove(nextCoverKey)]);
  await closeDatabase();
});

test('cache comum é reutilizado, publicação invalida e acesso/progresso continuam individuais', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const first = await browser.newContext();
  const second = await browser.newContext();
  const admin = await browser.newContext();
  try {
    const student = await first.newPage();
    await signIn(student, firstEmail, PASSWORD, `/sll/cursos/${slug}`);
    await expect(student.getByRole('heading', { level: 1, name: title })).toBeVisible();

    const cover = await first.request.get(`/api/sll/course-cover/${trackId}?v=cache-first.webp`);
    expect(cover.status()).toBe(200);
    expect(cover.headers()['cache-control']).toBe('private, max-age=300');
    const unversioned = await first.request.get(`/api/sll/course-cover/${trackId}`);
    expect(unversioned.headers()['cache-control']).toBe('private, no-store');

    // Alteração direta sem invalidação prova que outra visita reaproveita a leitura publicada.
    await database().query(
      'update learning_tracks set title=$1, cover_storage_key=$2 where id=$3',
      [changedTitle, nextCoverKey, trackId],
    );
    const oldCover = await first.request.get(`/api/sll/course-cover/${trackId}?v=cache-first.webp`);
    expect(oldCover.status()).toBe(404);
    expect(oldCover.headers()['cache-control']).toBe('no-store');
    const nextCover = await first.request.get(
      `/api/sll/course-cover/${trackId}?v=cache-second.webp`,
    );
    expect(nextCover.status()).toBe(200);
    expect(nextCover.headers()['cache-control']).toBe('private, max-age=300');
    await database().query(
      'insert into learning_lesson_progress (user_id, lesson_id, completed_at) values ($1, $2, now())',
      [firstId, lessonId],
    );
    await student.goto(`/sll/cursos/${slug}`);
    await expect(student.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(student.getByRole('region', { name: 'Aulas do curso' })).toContainText(
      '1 de 1 aulas concluídas',
    );

    const other = await second.newPage();
    await signIn(other, secondEmail, PASSWORD, `/sll/cursos/${slug}`);
    await expect(other.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(other.getByRole('region', { name: 'Aulas do curso' })).toContainText(
      '0 de 1 aulas concluídas',
    );

    const operator = await admin.newPage();
    await signIn(operator, adminEmail, PASSWORD, '/admin/textos');
    const group = operator
      .locator('details')
      .filter({ has: operator.locator('input[name="groupIndex"][value="0"]') });
    await group.locator('summary').click();
    const copy = `Bem-vinda ao teste ${trackId}`;
    await group.getByLabel('Texto de boas-vindas', { exact: true }).fill(copy);
    await group.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(
      group.getByRole('button', { name: 'Publicar para alunas', exact: true }),
    ).toBeVisible();
    await group.getByRole('button', { name: 'Publicar para alunas', exact: true }).click();
    await expect(
      group.getByText('Textos publicados. As alunas já veem esta versão.', { exact: true }),
    ).toBeVisible();
    await student.goto(`/sll/cursos/${slug}`);
    await expect(student.getByRole('heading', { level: 1, name: changedTitle })).toBeVisible();

    await mkdir('.data/cache-screens', { recursive: true });
    // O mesmo curso e o mesmo conteúdo se mantêm em celular/computador e nos dois temas.
    for (const width of [1440, 390]) {
      for (const theme of ['light', 'dark']) {
        await student.setViewportSize({ width, height: 960 });
        await student.evaluate((value) => localStorage.setItem('theme', value), theme);
        await student.goto(`/sll/cursos/${slug}`);
        await expect(student.getByRole('heading', { level: 1, name: changedTitle })).toBeVisible();
        await expectNoA11yViolations(student);
        await student.screenshot({
          path: `.data/cache-screens/course-${width}-${theme}.png`,
          fullPage: true,
        });
        expect(
          await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBe(true);
      }
    }
    await student.goto('/sll');
    await expect(student.getByText(copy, { exact: true })).toBeVisible();
    await operator.goto('/admin');
    await expect(operator.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
    for (const width of [1440, 390]) {
      for (const theme of ['light', 'dark']) {
        await operator.setViewportSize({ width, height: 960 });
        await operator.evaluate((value) => localStorage.setItem('theme', value), theme);
        await operator.goto('/admin');
        await expectNoA11yViolations(operator);
        await operator.screenshot({
          path: `.data/cache-screens/admin-${width}-${theme}.png`,
          fullPage: true,
        });
        expect(
          await operator.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBe(true);
      }
    }

    // O índice aquecido não pode manter o acesso depois de revogado no banco.
    await database().query("delete from student_products where user_id=$1 and product='sll'", [
      firstId,
    ]);
    await student.goto(`/sll/cursos/${slug}`);
    await expect(student).toHaveURL(/\/$/);
    await expect(student.getByRole('heading', { level: 1, name: changedTitle })).toHaveCount(0);
    await database().query('update "user" set banned=true where email=$1', [secondEmail]);
    await other.goto(`/sll/cursos/${slug}`);
    await expect(other).toHaveURL(/\/entrar\?motivo=conta-desativada$/);
  } finally {
    await Promise.all([first.close(), second.close(), admin.close()]);
  }
});

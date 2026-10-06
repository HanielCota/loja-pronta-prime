import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { assertTestDatabase } from './support/cleanup';
import { database, PASSWORD, studentEmail } from './support/students';

// Cada execução publica seu próprio curso e o remove ao terminar, sem editar o catálogo real.
const trackId = randomUUID();
const stageId = randomUUID();
const moduleId = randomUUID();
const requiredId = randomUUID();
const optionalId = randomUUID();
const slug = `e2e-course-${trackId}`;
const title = `Curso com aula opcional ${trackId}`;
let userId: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  assertTestDatabase();
  const db = database();
  const { rows } = await db.query<{ id: string }>('select id from "user" where email=$1', [
    studentEmail('sllprogress'),
  ]);
  expect(rows).toHaveLength(1);
  userId = rows[0]!.id;
  const connection = await db.connect();
  try {
    await connection.query('begin');
    await connection.query(
      `insert into learning_tracks (id, kind, slug, title, status)
       values ($1, 'complementary_course', $2, $3, 'published')`,
      [trackId, slug, title],
    );
    await connection.query(
      `insert into learning_stages (id, track_id, slug, title, status)
       values ($1, $2, 'aulas', 'Aulas do curso de teste', 'published')`,
      [stageId, trackId],
    );
    await connection.query(
      `insert into learning_modules (id, stage_id, slug, title, status)
       values ($1, $2, 'aulas', 'Aulas do curso de teste', 'published')`,
      [moduleId, stageId],
    );
    await connection.query(
      `insert into learning_lessons
         (id, module_id, slug, title, status, position, counts_toward_progress)
       values ($1, $3, 'principal', 'Aula principal', 'published', 0, true),
              ($2, $3, 'opcional', 'Aula opcional', 'published', 1, false)`,
      [requiredId, optionalId, moduleId],
    );
    await connection.query('commit');
  } catch (error) {
    await connection.query('rollback');
    throw error;
  } finally {
    connection.release();
  }
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=$1 and slug=$2', [trackId, slug]);
});

for (const size of [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  for (const theme of ['light', 'dark']) {
    test(`${size.name} ${theme}: aula opcional e anúncio de conclusão`, async ({ page }) => {
      // Só a aluna e as aulas desta execução recebem o progresso inicial.
      await database().query(
        `insert into learning_lesson_progress (user_id, lesson_id, completed_at)
         values ($1, $2, now()), ($1, $3, null)
         on conflict (user_id, lesson_id) do update set completed_at=excluded.completed_at`,
        [userId, requiredId, optionalId],
      );
      await page.setViewportSize(size);
      await signIn(page, studentEmail('sllprogress'), PASSWORD, '/sll/cursos');
      await expect(page).toHaveURL(/\/sll\/cursos$/);
      if (theme === 'dark') {
        await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
      }
      const card = page.getByRole('heading', { level: 3, name: title, exact: true }).locator('..');
      await expect(card).toContainText('1 de 2 aulas concluídas');
      await expect(card.getByRole('link', { name: 'Continuar curso', exact: true })).toBeVisible();

      await page.goto(`/sll/aula/${optionalId}`);
      const announcement = page.locator('[aria-live="polite"]');
      await expect(announcement).toHaveCount(1);
      await expect(announcement).toHaveText('');
      await expect(announcement).toHaveAttribute('aria-atomic', 'true');
      // A região vazia já está exposta; display:none impediria o registro pelo leitor de tela.
      expect(
        await announcement.evaluate((node) => {
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }),
      ).toBe(true);
      await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
      await expect(announcement).toHaveText('A aula foi marcada como concluída.');
      await expect(page.getByRole('button', { name: 'Desmarcar como concluída' })).toBeVisible();
      await expectNoA11yViolations(page);

      await page.goto('/sll/cursos');
      await expect(card).toContainText('2 de 2 aulas concluídas');
      const progress = card.getByRole('progressbar');
      await expect(progress).toHaveAttribute('value', '2');
      await expect(progress).toHaveAttribute('max', '2');
      await expect(card.getByRole('link', { name: 'Revisar curso', exact: true })).toBeVisible();
      await expectNoA11yViolations(page);
      await mkdir('.data/sll-regression-screens', { recursive: true });
      await card.screenshot({
        path: `.data/sll-regression-screens/course-${size.name}-${theme}.png`,
      });

      await page.goto(`/sll/cursos/${slug}`);
      await expect(page.getByRole('region', { name: 'Aulas do curso' })).toContainText(
        '2 de 2 aulas concluídas',
      );
      await page.goto(`/sll/aula/${optionalId}`);
      await page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }).click();
      await expect(announcement).toHaveText('A conclusão da aula foi desfeita.');
      await page.goto('/sll/cursos');
      await expect(card).toContainText('1 de 2 aulas concluídas');
      await expect(card.getByRole('link', { name: 'Continuar curso', exact: true })).toBeVisible();
    });
  }
}

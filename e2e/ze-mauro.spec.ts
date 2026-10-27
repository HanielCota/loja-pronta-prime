import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { importZeCourse } from '@/features/ze-mauro/server/import-course';
import { importInitialSllContent } from '@/features/sll/server/import-initial-content';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const run = randomUUID();
const emails = [`e2e-ze-${run}@example.invalid`, `e2e-pri-${run}@example.invalid`];
const userIds: string[] = [];
// Local cache/IP test headers trigger CORS preflights inside the external Panda player.
test.use({ extraHTTPHeaders: {} });
let lessonId = '';
let pendingId = '';
let priLessonId = '';
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  assertTestDatabase();
  await importZeCourse(database());
  await importInitialSllContent(database());
  for (const [index, email] of emails.entries()) {
    const { user } = await auth.api.createUser({
      body: {
        email,
        password: PASSWORD,
        name: 'Course Browser Test',
        role: 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    userIds.push(user.id);
    await database().query("insert into student_products (user_id, product) values ($1, 'sll')", [
      user.id,
    ]);
    await database().query(
      "insert into manual_product_grants (user_id, product) values ($1, 'sll')",
      [user.id],
    );
    if (index === 0)
      await database().query(
        "insert into student_experiences (user_id, expert, manual_expert) values ($1, 'ze', 'ze')",
        [user.id],
      );
  }
  const { rows } = await database().query<{
    id: string;
    expert: string;
    slug: string;
    video_id: string | null;
  }>(
    `select l.id, t.expert, l.slug, b.data->>'videoId' as video_id from learning_lessons l join learning_modules m on m.id=l.module_id join learning_stages s on s.id=m.stage_id join learning_tracks t on t.id=s.track_id left join learning_content_blocks b on b.lesson_id=l.id and b.kind='video' order by t.position, s.position, m.position, l.position`,
  );
  lessonId = rows.find((row) => row.expert === 'ze' && row.video_id)!.id;
  pendingId = rows.find((row) => row.expert === 'ze' && !row.video_id)!.id;
  priLessonId = rows.find((row) => row.expert === 'pri' && row.video_id)!.id;
});

test.afterAll(async () => {
  await database().query('delete from "user" where id=any($1::text[])', [userIds]);
  await closeDatabase();
});

test('Zé course works on desktop and mobile in both themes with accessible lessons', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await signIn(page, emails[0]!, PASSWORD);
  await page.setExtraHTTPHeaders({});
  await expect(page).toHaveURL('/ze-mauro');
  await mkdir('test-results/ze-mauro', { recursive: true });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => localStorage.setItem('theme', value), theme);
      await page.goto('/ze-mauro');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Seu caminho com o Zé Mauro',
      );
      await expect(page.getByText('0 de 57 aulas concluídas')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ir para o curso da Pri' })).toHaveCount(0);
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expectNoA11yViolations(page);
      const home = `test-results/ze-mauro/home-${viewport.width}-${theme}.png`;
      await page.screenshot({ path: home });
      await testInfo.attach(`home-${viewport.width}-${theme}`, {
        path: home,
        contentType: 'image/png',
      });
      await page.getByRole('link', { name: 'Começar meu curso', exact: true }).click();
      await expect(page).toHaveURL(`/ze-mauro/aula/${lessonId}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cuidado com o Dinheiro');
      await expect(page.locator('iframe')).toHaveAttribute(
        'src',
        /v=4b6b9002-4a5a-4030-8d6a-20696b11e117&autoplay=false/,
      );
      const player = page.frameLocator('iframe').locator('video');
      await expect(player).toBeVisible({ timeout: 30_000 });
      if (viewport.width === 1440 && theme === 'light') {
        await player.evaluate((element: HTMLVideoElement) => {
          element.muted = true;
        });
        await page
          .frameLocator('iframe')
          .getByRole('button', { name: 'Reproduzir', exact: true })
          .last()
          .click();
        await expect
          .poll(() => player.evaluate((element: HTMLVideoElement) => element.currentTime), {
            timeout: 30_000,
          })
          .toBeGreaterThan(0);
        await player.evaluate((element: HTMLVideoElement) => element.pause());
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expectNoA11yViolations(page, ['iframe']);
      const lesson = `test-results/ze-mauro/lesson-${viewport.width}-${theme}.png`;
      await page.screenshot({ path: lesson });
      await testInfo.attach(`lesson-${viewport.width}-${theme}`, {
        path: lesson,
        contentType: 'image/png',
      });
    }
  }
});

test('Zé completion works without JavaScript and unavailable lessons cannot be completed', async ({
  page,
  browser,
}) => {
  await signIn(page, emails[0]!, PASSWORD, `/ze-mauro/aula/${lessonId}`);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
  });
  try {
    const plain = await context.newPage();
    await plain.goto(`/ze-mauro/aula/${lessonId}`);
    await plain.getByRole('button', { name: 'Marcar como concluída' }).click();
    await expect(plain.getByRole('button', { name: 'Desfazer conclusão' })).toBeVisible();
    await plain.reload();
    await expect(plain.getByRole('button', { name: 'Desfazer conclusão' })).toBeVisible();
    await plain.goto('/ze-mauro');
    await expect(plain.getByText('1 de 57 aulas concluídas')).toBeVisible();
    await plain.goto(`/ze-mauro/aula/${pendingId}`);
    await expect(plain.getByRole('heading', { name: 'Vídeo em breve' })).toBeVisible();
    await expect(plain.getByRole('button', { name: 'Marcar como concluída' })).toHaveCount(0);
    const { rows } = await database().query(
      'select 1 from learning_lesson_progress where user_id=$1 and lesson_id=$2',
      [userIds[0], pendingId],
    );
    expect(rows).toHaveLength(0);
  } finally {
    await context.close();
  }
});

test('purchases from one expert cannot open the other expert course through direct links', async ({
  page,
  browser,
}) => {
  await signIn(page, emails[0]!, PASSWORD);
  await page.goto(`/sll/aula/${priLessonId}`);
  await expect(page).toHaveURL('/ze-mauro');
  const context = await browser.newContext();
  try {
    const pri = await context.newPage();
    await signIn(pri, emails[1]!, PASSWORD, `/ze-mauro/aula/${lessonId}`);
    await expect(pri).toHaveURL('/sll');
    await expect(pri.getByRole('heading', { name: 'Seu caminho com o Zé Mauro' })).toHaveCount(0);
    await page.goto('/menu');
    await expect(
      page.getByRole('link', { name: 'Acessar meu curso, Curso Zé Mauro' }),
    ).toHaveAttribute('href', '/ze-mauro');
  } finally {
    await context.close();
  }
});

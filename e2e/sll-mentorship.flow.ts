import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { mentorshipLiveInput } from '@/features/sll/mentorship';
import { auth } from '@/server/auth/auth';
import { importInitialSllContent } from '@/features/sll/server/import-initial-content';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const run = randomUUID();
const emails = ['admin', 'student', 'ze'].map((role) => `${role}-${run}@example.invalid`);
function futureLiveTime() {
  return mentorshipLiveInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  assertTestDatabase();
  await importInitialSllContent(database());
  for (const [index, email] of emails.entries()) {
    const { user } = await auth.api.createUser({
      body: {
        email,
        password: PASSWORD,
        name: 'Browser Test',
        role: index === 0 ? 'admin' : 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    if (index > 0) {
      await database().query("insert into student_products (user_id, product) values ($1, 'sll')", [
        user.id,
      ]);
      await database().query(
        "insert into manual_product_grants (user_id, product) values ($1, 'sll')",
        [user.id],
      );
    }

    if (index === 2) {
      await database().query(
        "insert into student_experiences (user_id, expert, manual_expert) values ($1, 'ze', 'ze')",
        [user.id],
      );
    }
  }
});

test.afterAll(async () => {
  await closeDatabase();
});

test('administrator publishes lessons and updates upcoming events and recordings', async ({
  page,
}) => {
  await signIn(page, emails[0]!, PASSWORD, '/admin/mentoria');
  const welcome = page.getByRole('form', { name: 'Aula de boas-vindas' });
  await welcome.getByLabel('Link do vídeo').fill('https://youtu.be/abcdefghijk');
  await welcome.getByRole('button', { name: 'Salvar aula' }).click();
  await expect(page.getByText('Mentoria atualizada.')).toBeVisible();
  const live = page.getByRole('form', { name: 'Agendar live' });
  await live.getByLabel('Título da live').fill('Live agendada');
  await live.getByLabel('Data e hora (Brasília)').fill(futureLiveTime());
  await live.getByLabel('Link da live no YouTube').fill('https://youtube.com/live/abcdefghijk');
  await live.getByRole('button', { name: 'Agendar live' }).click();
  await expect(page.getByRole('form', { name: 'Live agendada' })).toBeVisible();
  await live.getByLabel('Título da live').fill('Live anterior');
  await live.getByLabel('Data e hora (Brasília)').fill('2026-01-01T19:00');
  await live.getByLabel('Link da gravação no YouTube').fill('https://youtu.be/lmnopqrstuv');
  await live.getByRole('button', { name: 'Agendar live' }).click();
  await expect(page.getByRole('form', { name: 'Live anterior' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('SLL students reach the published content on desktop and mobile', async ({ page }) => {
  await signIn(page, emails[1]!, PASSWORD, '/sll/mentoria');

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });

    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => localStorage.setItem('theme', value), theme);
      await page.goto('/sll/mentoria');

      if (width === 390) {
        await page.locator('summary').filter({ hasText: 'Seções do SLL' }).click();
      }

      await expect(page.getByRole('link', { name: 'Mentoria C/ Zé Mauro' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(
        page.getByRole('link', { name: /Assistir aula · Aula de boas-vindas/ }),
      ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk');
      await expect(page.getByText('Em breve', { exact: true })).toHaveCount(6);
      await expect(
        page
          .getByRole('region', { name: 'Calendário das lives' })
          .getByRole('heading', { name: 'Live agendada' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: /Ver gravação no YouTube/ })).toHaveAttribute(
        'href',
        'https://www.youtube.com/watch?v=lmnopqrstuv',
      );
      await expectNoA11yViolations(page);
    }
  }
});

test('Zé-only course access redirects to its own area', async ({ page }) => {
  await signIn(page, emails[2]!, PASSWORD, '/sll/mentoria');
  await expect(page).toHaveURL('/ze-mauro');
});

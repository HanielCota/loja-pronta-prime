import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { patchNotes } from '@/features/patch-notes/entries';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

test.afterAll(closeDatabase);
test.setTimeout(120_000);

test('daily updates are readable in both themes and restricted to administrators', async ({
  page,
  browser,
}) => {
  await page.goto('/admin/novidades');
  await expect(page).toHaveURL(/\/entrar\?next=/);
  const userIds: string[] = [];
  try {
    for (const role of ['user', 'support_agent', 'admin'] as const) {
      const email = `e2e-updates-${randomUUID()}@teste.com`;
      const { user } = await auth.api.createUser({
        body: {
          email,
          password: PASSWORD,
          name: 'Updates reader',
          role,
          data: { emailVerified: true, mustChangePassword: false },
        },
      });
      userIds.push(user.id);
      const context = await browser.newContext();
      try {
        const reader = await context.newPage();
        await signIn(reader, email, PASSWORD, '/admin/novidades');
        if (role !== 'admin') {
          expect((await reader.goto('/admin/novidades'))?.status()).toBe(404);
          await expect(reader.getByText('Histórico de novidades no painel')).toHaveCount(0);
          continue;
        }
        await expect(reader.getByRole('heading', { name: 'Novidades', exact: true })).toBeVisible();
        const dates = await reader
          .locator('time')
          .evaluateAll((elements) => elements.map((element) => element.getAttribute('datetime')));
        expect(dates).toEqual(patchNotes.map((day) => day.date));
        expect(dates).toEqual([...new Set(dates)].toSorted().toReversed());
        for (const mobile of [false, true]) {
          for (const theme of ['light', 'dark']) {
            await reader.setViewportSize(
              mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
            );
            await reader.evaluate((value) => localStorage.setItem('theme', value), theme);
            await reader.reload();
            await expectNoA11yViolations(reader);
            expect(
              await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            if (mobile)
              await reader.locator('summary').filter({ hasText: 'Seções do painel' }).click();
            await expect(
              reader
                .getByRole('link', { name: 'Novidades', exact: true })
                .filter({ visible: true }),
            ).toHaveAttribute('aria-current', 'page');
            await reader.screenshot({
              path: `.data/updates-${mobile ? 'mobile' : 'desktop'}-${theme}.png`,
              fullPage: true,
            });
          }
        }
        const noJs = await browser.newContext({
          javaScriptEnabled: false,
          storageState: await context.storageState(),
        });
        try {
          const staticReader = await noJs.newPage();
          await staticReader.goto('/admin/novidades');
          await expect(
            staticReader.getByRole('heading', { name: 'Novidades', exact: true }),
          ).toBeVisible();
          await expect(staticReader.locator('time')).toHaveCount(patchNotes.length);
        } finally {
          await noJs.close();
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await database().query('delete from "user" where id = any($1::text[])', [userIds]);
  }
});

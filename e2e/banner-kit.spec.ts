import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { storage } from '@/server/storage';
import { ONBOARDING_QUESTIONS } from '@/config/onboarding';
import { expectNoA11yViolations, signIn } from './support/auth';
import { closeDatabase, database, PASSWORD } from './support/students';

const ids: string[] = [];
const keys: string[] = [];
const path = '/loja-pronta/marca/banners';
async function account() {
  const email = `banners-${randomUUID()}@example.invalid`;
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Banner student',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  ids.push(user.id);
  const key = `logos/${user.id}/${randomUUID()}.png`;
  keys.push(key);
  await storage().put(key, await readFile('src/app/icon.png'), 'image/png');
  await database().query(
    "insert into student_products (user_id, product) values ($1, 'loja-pronta')",
    [user.id],
  );
  await database().query(
    "insert into manual_product_grants (user_id, product) values ($1, 'loja-pronta')",
    [user.id],
  );
  await database().query('insert into stores (user_id, phase) values ($1, 3)', [user.id]);
  const answers = Object.fromEntries(
    ONBOARDING_QUESTIONS.map((q) => [
      q.id,
      q.kind === 'longtext' ? '' : q.kind === 'multi' ? [q.options[0].label] : q.options[0].label,
    ]),
  );
  await database().query(
    "insert into store_onboarding (user_id, answers, whatsapp, completed_at) values ($1, $2, '11987654321', now())",
    [user.id, JSON.stringify(answers)],
  );
  await database().query(
    "insert into store_brand (user_id, name, logo_image, description, completed_at) values ($1, 'Jardim da Ana', $2, 'Uma seleção para seu dia a dia.', now())",
    [user.id, key],
  );
  return { id: user.id, email };
}
test.afterEach(async () => {
  try {
    await Promise.all(keys.splice(0).map((key) => storage().remove(key)));
  } finally {
    await database().query('delete from "user" where id = any($1::text[])', [ids.splice(0)]);
  }
});
test.afterAll(closeDatabase);

for (const mobile of [false, true])
  for (const dark of [false, true]) {
    test(`banner approval and download: ${mobile ? 'mobile' : 'desktop'} ${dark ? 'dark' : 'light'}`, async ({
      page,
      browser,
    }) => {
      const student = await account();
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 },
      );
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
      await page.addInitScript(
        (useDark) => localStorage.setItem('theme', useDark ? 'dark' : 'light'),
        dark,
      );
      await signIn(page, student.email, PASSWORD, path);
      await expect(page.getByRole('heading', { name: 'Meus banners', exact: true })).toBeVisible();
      if (dark) await expect(page.locator('html')).toHaveClass(/dark/);
      else await expect(page.locator('html')).not.toHaveClass(/dark/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.getByRole('button', { name: 'Criar prévia dos banners' }).click();
      await expect(page.getByRole('heading', { name: 'Confira seus banners' })).toBeVisible();
      for (const image of await page.getByRole('img', { name: /Prévia do banner/ }).all())
        await expect
          .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
          .toBe(750);
      const image = page.getByRole('img', { name: /Prévia do banner boas-vindas/ });
      const src = (await image.getAttribute('src'))!;
      expect((await page.request.get(`${src}&baixar=1`)).status()).toBe(403);
      const anonymous = await browser.newContext();
      try {
        expect((await anonymous.request.get(`${new URL(page.url()).origin}${src}`)).status()).toBe(
          404,
        );
      } finally {
        await anonymous.close();
      }
      await expectNoA11yViolations(page);
      await page.getByRole('checkbox', { name: /Conferi os dois banners/ }).check();
      await page.getByRole('button', { name: 'Aprovar meu kit' }).click();
      await expect(page.getByRole('heading', { name: 'Kit aprovado' })).toBeVisible();
      const download = await page.request.get(
        (await page
          .getByRole('link', { name: 'Baixar banner de boas-vindas' })
          .getAttribute('href'))!,
      );
      expect(download.status()).toBe(200);
      expect(download.headers()['content-disposition']).toContain('attachment');
      expect((await download.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      await page.screenshot({
        path: `.data/brand-banners/banner-kit-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      await page.getByLabel('Frase de boas-vindas').fill('Novidades escolhidas para você');
      await page.getByRole('button', { name: 'Salvar nova prévia' }).click();
      await expect(page.getByRole('heading', { name: 'Confira seus banners' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Baixar banner/ })).toHaveCount(0);
      expect((await page.request.get(`${src}&baixar=1`)).status()).toBe(409);
      await database().query("update store_brand set name = 'Outra loja' where user_id = $1", [
        student.id,
      ]);
      await page.reload();
      await expect(page.getByText(/Sua marca mudou/)).toBeVisible();
      await expect(page.getByRole('img', { name: /Prévia do banner/ })).toHaveCount(0);
      expect((await page.request.get(`${src}&baixar=1`)).status()).toBe(409);
    });
  }

test('kit forms work without JavaScript', async ({ browser }) => {
  const student = await account();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
  });
  const page = await context.newPage();
  try {
    await signIn(page, student.email, PASSWORD, path);
    await page.getByRole('button', { name: 'Criar prévia dos banners' }).click();
    await expect(page.getByRole('heading', { name: 'Confira seus banners' })).toBeVisible();
    await page.getByRole('checkbox', { name: /Conferi os dois banners/ }).check();
    await page.getByRole('button', { name: 'Aprovar meu kit' }).click();
    await expect(page.getByRole('link', { name: 'Baixar banner de boas-vindas' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('automatic brand authorization belongs to the exact reviewed brand', async ({ page }) => {
  const student = await account();
  await signIn(page, student.email, PASSWORD, '/loja-pronta/marca/revisao');
  await database().query("update store_brand set name = 'Marca alterada' where user_id = $1", [
    student.id,
  ]);
  await page.getByRole('button', { name: 'Confirmar alterações da marca' }).click();
  await expect(
    page.getByText('Sua marca mudou em outra página. Atualize a revisão antes de confirmar.'),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Confirmar alterações da marca' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
  const { rows } = await database().query(
    'select publication_fingerprint from store_brand where user_id = $1',
    [student.id],
  );
  expect(rows[0].publication_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  await page.goto('/loja-pronta/marca/nome?editar=1');
  await page.getByRole('textbox', { name: 'Nome da loja', exact: true }).fill('Minha nova marca');
  await page.getByRole('button', { name: 'Continuar com “Minha nova marca”' }).click();
  await expect(page).toHaveURL(/\/marca\/logo\?/);
  const changed = await database().query(
    'select publication_fingerprint from store_brand where user_id = $1',
    [student.id],
  );
  expect(changed.rows[0].publication_fingerprint).toBeNull();
});

test('an existing completed journey can authorize its saved brand without reopening editing', async ({
  page,
}) => {
  const student = await account();
  await database().query('update stores set phase = 7 where user_id = $1', [student.id]);
  await signIn(page, student.email, PASSWORD, '/loja-pronta/marca/publication');
  await page.getByRole('checkbox', { name: /Quero aplicar este nome/ }).check();
  await page.getByRole('button', { name: 'Autorizar envio automático da marca' }).click();
  await expect(page).toHaveURL(/\/produtos\?resultado=brand-approved$/);
  await expect(page.getByText(/Marca confirmada. O envio será preparado/)).toBeVisible();
  await expect(page.getByText(/Não foi possível preparar a publicação/)).toHaveCount(0);
  const { rows } = await database().query(
    'select b.publication_fingerprint, s.phase from store_brand b join stores s using (user_id) where b.user_id = $1',
    [student.id],
  );
  expect(rows[0].publication_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(rows[0].phase).toBe(7);
});

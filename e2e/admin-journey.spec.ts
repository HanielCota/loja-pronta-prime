import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { storage } from '@/server/storage';
import { ONBOARDING_QUESTIONS } from '@/config/onboarding';
import { expectNoA11yViolations, signIn } from './support/auth';
import { closeDatabase, database, PASSWORD } from './support/students';

const createdIds: string[] = [];
const storedKeys: string[] = [];
const answers = Object.fromEntries(
  ONBOARDING_QUESTIONS.map((question) => [
    question.id,
    question.kind === 'longtext'
      ? ''
      : question.kind === 'multi'
        ? [question.options[0].label]
        : question.options[0].label,
  ]),
);

async function createAccount(admin = false) {
  const email = `journey-${randomUUID()}@example.invalid`;
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: admin ? 'Journey administrator' : 'Journey student',
      role: admin ? 'admin' : 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  createdIds.push(user.id);
  return { id: user.id, email };
}

async function seedJourney(id: string) {
  await database().query(
    "insert into student_products (user_id, product) values ($1, 'loja-pronta')",
    [id],
  );
  // A submitted conversation with a stale stored phase must match the student's actual dashboard.
  await database().query('insert into stores (user_id, phase) values ($1, 1)', [id]);
  await database().query(
    "insert into store_onboarding (user_id, answers, whatsapp, completed_at) values ($1, $2, '11987654321', now())",
    [id, JSON.stringify(answers)],
  );
  await database().query(
    "insert into store_brand (user_id, name) values ($1, 'Saved test store')",
    [id],
  );
}

async function seedStoreImages(id: string) {
  const keys: string[] = [];
  for (const file of ['public/brand/mascote.png', 'src/app/icon.png']) {
    const key = `logos/${id}/${randomUUID()}.png`;
    storedKeys.push(key);
    await storage().put(key, await readFile(file), 'image/png');
    keys.push(key);
  }
  await database().query('insert into logo_studio (user_id, logos) values ($1, $2)', [
    id,
    JSON.stringify(keys.map((key, index) => ({ key, ...(index ? { uploaded: true } : {}) }))),
  ]);
  await database().query(
    "update store_brand set logo_image = $2, description = 'Saved store description.' where user_id = $1",
    [id, keys[0]],
  );
}

async function snapshot(id: string) {
  const { rows } = await database().query(
    `select jsonb_build_object(
       'store', (select to_jsonb(s) from stores s where s.user_id = $1),
       'onboarding', (select to_jsonb(o) from store_onboarding o where o.user_id = $1),
       'brand', (select to_jsonb(b) from store_brand b where b.user_id = $1),
       'studio', (select to_jsonb(l) from logo_studio l where l.user_id = $1),
       'product', (select to_jsonb(p) from student_products p where p.user_id = $1),
       'presence', (select to_jsonb(p) from user_presence p where p.user_id = $1)
     ) as journey`,
    [id],
  );
  return rows[0].journey;
}

test.afterEach(async () => {
  try {
    await Promise.all(storedKeys.splice(0).map((key) => storage().remove(key)));
  } finally {
    await database().query('delete from "user" where id = any($1::text[])', [createdIds.splice(0)]);
  }
});
test.afterAll(closeDatabase);

for (const mobile of [false, true]) {
  for (const dark of [false, true]) {
    test(`current stage: ${mobile ? 'mobile' : 'desktop'}, ${dark ? 'dark' : 'light'}`, async ({
      page,
    }) => {
      const admin = await createAccount(true);
      const student = await createAccount();
      await seedJourney(student.id);
      await seedStoreImages(student.id);
      const before = await snapshot(student.id);
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.addInitScript(
        (useDark) => localStorage.setItem('theme', useDark ? 'dark' : 'light'),
        dark,
      );
      await signIn(page, admin.email, PASSWORD, `/admin/contas/${student.id}`);
      await expect(page.getByRole('region', { name: 'Resumo', exact: true })).toContainText(
        '2 de 7',
      );
      const open = page.getByRole('link', { name: 'View current stage', exact: true });
      await open.focus();
      await expect(open).toBeFocused();
      await open.press('Enter');
      await expect(
        page.getByRole('heading', { name: 'Journey student · Current stage' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Journey student · Current stage' }),
      ).toHaveAttribute('lang', 'en');
      await expect(
        page.getByRole('link', { name: 'Back to account', exact: true }),
      ).toHaveAttribute('lang', 'en');
      await expect(page.getByRole('region', { name: 'Store brand', exact: true })).toContainText(
        'Phase 2 of 7',
      );
      await expect(
        page.getByRole('heading', { name: 'Review and confirm the brand' }),
      ).toBeVisible();
      const appearance = page.getByRole('region', { name: 'Store appearance', exact: true });
      await expect(appearance.getByText('Saved test store', { exact: true })).toBeVisible();
      await expect(appearance.getByText('Saved store description.', { exact: true })).toBeVisible();
      await expect(appearance).toContainText('does not confirm publication on Shopee');
      const gallery = page.getByRole('region', { name: 'Saved images (2)', exact: true });
      await expect(gallery.getByRole('img')).toHaveCount(2);
      await expect(gallery.getByText('Selected logo', { exact: true })).toHaveCount(1);
      await expect(gallery.getByText('Uploaded', { exact: true })).toHaveCount(1);
      for (const image of await gallery.getByRole('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
          )
          .toBe(true);
      }
      await expect(
        gallery.getByRole('link', { name: 'View full image 1 (opens in a new tab)' }),
      ).toHaveAttribute('target', '_blank');
      await expect(page.getByText('Read-only view.', { exact: false })).toBeVisible();
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `.data/admin-journey-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      expect(await snapshot(student.id)).toEqual(before);
      await page.getByRole('link', { name: 'Back to account', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Journey student', exact: true }),
      ).toBeVisible();
      await page.goto('/admin/contas');
      await expect(page.getByRole('searchbox', { name: 'Buscar por nome ou email' })).toBeVisible();
    });
  }
}

test('anonymous and student requests cannot read another journey or its logo', async ({
  page,
  request,
}) => {
  const target = await createAccount();
  const viewer = await createAccount();
  await seedJourney(target.id);
  const path = `/admin/contas/${target.id}/journey`;
  const anonymous = await request.get(path, { maxRedirects: 0 });
  expect(anonymous.status()).toBe(307);
  expect(anonymous.headers().location).toContain('/entrar');
  expect((await request.get(`${path}/logo`, { maxRedirects: 0 })).status()).toBe(307);
  expect((await request.get(`${path}/images/0`, { maxRedirects: 0 })).status()).toBe(307);
  await signIn(page, viewer.email, PASSWORD, '/perfil');
  expect((await page.goto(path))?.status()).toBe(404);
  expect((await page.request.get(`${path}/logo`)).status()).toBe(404);
  expect((await page.request.get(`${path}/images/0`)).status()).toBe(404);
});

test('saved next steps remain accurate through all phases without changing student data', async ({
  page,
}) => {
  const admin = await createAccount(true);
  const student = await createAccount();
  const path = `/admin/contas/${student.id}/journey`;
  await signIn(page, admin.email, PASSWORD, path);
  await expect(page.getByText('The student has not started the conversation.')).toBeVisible();
  await expect(page.getByText('Not answered yet', { exact: true })).toHaveCount(5);
  await expect(page.getByText('No store images have been saved yet.')).toBeVisible();
  await expect(page.getByText(/does not currently have Loja Pronta access/)).toBeVisible();
  await database().query('insert into stores (user_id, phase) values ($1, 2)', [student.id]);
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Initial conversation', exact: true }),
  ).toBeVisible();
  await database().query('insert into store_onboarding (user_id, answers) values ($1, $2)', [
    student.id,
    JSON.stringify({ vendas: answers.vendas }),
  ]);
  await page.reload();
  await expect(page.getByText(ONBOARDING_QUESTIONS[1].ask, { exact: true })).toBeVisible();
  await database().query(
    "update store_onboarding set answers = $2, whatsapp = '11987654321', completed_at = now() where user_id = $1",
    [student.id, JSON.stringify(answers)],
  );
  for (const phase of [2, 3, 4, 5, 6, 7]) {
    await database().query('update stores set phase = $2 where user_id = $1', [student.id, phase]);
    const before = await snapshot(student.id);
    await page.reload();
    await expect(page.getByText(new RegExp(`Phase ${phase} of 7`))).toBeVisible();
    if (phase >= 5)
      await expect(page.getByRole('heading', { name: 'Coming soon', exact: true })).toBeVisible();
    expect(await snapshot(student.id)).toEqual(before);
  }
  await database().query('update "user" set banned = true where id = $1', [student.id]);
  await page.reload();
  await expect(
    page.getByText('This account is blocked. The saved journey is shown below.'),
  ).toBeVisible();
  expect((await page.request.get(`${path}/logo`)).status()).toBe(404);
  expect((await page.goto(`/admin/contas/${randomUUID()}/journey`))?.status()).toBe(404);
});

test('the stage link and return path work without JavaScript', async ({ browser }) => {
  const admin = await createAccount(true);
  const student = await createAccount();
  await seedJourney(student.id);
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await signIn(page, admin.email, PASSWORD, `/admin/contas/${student.id}`);
    await page.getByRole('link', { name: 'View current stage', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Create or upload the logo' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Journey student', exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('the administrator can read only the selected saved logo through an uncached private response', async ({
  page,
}) => {
  const admin = await createAccount(true);
  const student = await createAccount();
  await seedJourney(student.id);
  const png = await readFile('public/brand/mascote.png');
  const key = `logos/${student.id}/journey-test-${randomUUID()}.png`;
  try {
    await storage().put(key, png, 'image/png');
    await database().query('update store_brand set logo_image = $2 where user_id = $1', [
      student.id,
      key,
    ]);
    const path = `/admin/contas/${student.id}/journey`;
    await signIn(page, admin.email, PASSWORD, path);
    await expect(page.getByRole('img', { name: 'Saved logo for Saved test store' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Saved images (1)', exact: true })).toBeVisible();
    const response = await page.request.get(`${path}/logo`);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('private, no-store');
    expect(response.headers()['content-type']).toBe('image/png');
    expect(await response.body()).toEqual(png);
    expect((await page.request.get(`/admin/contas/${admin.id}/journey/logo`)).status()).toBe(404);
    await database().query('insert into logo_studio (user_id, logos) values ($1, $2)', [
      student.id,
      JSON.stringify([{ key, uploaded: true }]),
    ]);
    await page.reload();
    const gallery = page.getByRole('region', { name: 'Saved images (1)', exact: true });
    await expect(gallery.getByRole('img')).toHaveAttribute('src', `${path}/images/0`);
    const savedImage = await page.request.get(`${path}/images/0`);
    expect(savedImage.status()).toBe(200);
    expect(savedImage.headers()['cache-control']).toBe('private, no-store');
    expect(savedImage.headers()['content-type']).toBe('image/png');
    expect(await savedImage.body()).toEqual(png);
    for (const index of ['99', '-1', '00', 'image.png']) {
      expect((await page.request.get(`${path}/images/${index}`)).status()).toBe(404);
    }
    expect((await page.request.get(`/admin/contas/${admin.id}/journey/images/0`)).status()).toBe(
      404,
    );
  } finally {
    await storage().remove(key);
  }
});

test('the shared packaging composition remains available in the student studio', async ({
  page,
}) => {
  const student = await createAccount();
  await seedJourney(student.id);
  await seedStoreImages(student.id);
  await signIn(page, student.email, PASSWORD, '/loja-pronta/marca/logo');
  const scene = page.locator('img[src="/brand/kit-envio-kraft.webp"]');
  await expect(scene).toBeVisible();
  await expect
    .poll(() => scene.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0))
    .toBe(true);
  const composition = await scene.evaluate((node) => {
    const frame = node.parentElement!;
    const bounds = frame.getBoundingClientRect();
    return {
      layers: frame.querySelectorAll('img').length,
      ratio: bounds.width / bounds.height,
      fit: getComputedStyle(node).objectFit,
    };
  });
  expect(composition.layers).toBe(4);
  expect(composition.ratio).toBeCloseTo(1.5, 2);
  expect(composition.fit).toBe('contain');
  await expectNoA11yViolations(page);
});

test('invalid saved image references are skipped and invalid selected logos return 404', async ({
  page,
}) => {
  const admin = await createAccount(true);
  const student = await createAccount();
  await seedJourney(student.id);
  await seedStoreImages(student.id);
  await database().query('update logo_studio set logos = $2::jsonb || logos where user_id = $1', [
    student.id,
    JSON.stringify([{ key: '../invalid.png' }, { key: 'logos/another-account/legacy.png' }]),
  ]);
  const path = `/admin/contas/${student.id}/journey`;
  const before = await snapshot(student.id);
  await signIn(page, admin.email, PASSWORD, path);
  const first = await page.request.get(`${path}/images/0`);
  expect(first.status()).toBe(200);
  expect(await first.body()).toEqual(await readFile('public/brand/mascote.png'));
  const gallery = page.getByRole('region', { name: 'Saved images (2)', exact: true });
  await expect(gallery.getByRole('img')).toHaveCount(2);
  expect((await page.request.get(`${path}/images/2`)).status()).toBe(404);
  expect(await snapshot(student.id)).toEqual(before);
  await database().query('update store_brand set logo_image = $2 where user_id = $1', [
    student.id,
    '../invalid.png',
  ]);
  const invalidSelected = await snapshot(student.id);
  await page.reload();
  await expect(page.getByText('Saved logo is unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Saved logo for Saved test store' })).toHaveCount(0);
  expect((await page.request.get(`${path}/logo`)).status()).toBe(404);
  expect(await snapshot(student.id)).toEqual(invalidSelected);
});

for (const change of ['role', 'session', 'blocked', 'password'] as const) {
  test(`open previews and media enforce current administrator access after ${change} changes`, async ({
    page,
  }) => {
    const admin = await createAccount(true);
    const student = await createAccount();
    await seedJourney(student.id);
    await seedStoreImages(student.id);
    const path = `/admin/contas/${student.id}/journey`;
    await signIn(page, admin.email, PASSWORD, path);
    expect((await page.request.get(`${path}/logo`)).status()).toBe(200);
    expect((await page.request.get(`${path}/images/0`)).status()).toBe(200);
    if (change === 'role')
      await database().query('update "user" set role = null where id = $1', [admin.id]);
    if (change === 'session')
      await database().query('delete from session where user_id = $1', [admin.id]);
    if (change === 'blocked')
      await database().query('update "user" set banned = true where id = $1', [admin.id]);
    if (change === 'password')
      await database().query('update "user" set must_change_password = true where id = $1', [
        admin.id,
      ]);
    const expected = change === 'role' ? 404 : 307;
    for (const route of [path, `${path}/logo`, `${path}/images/0`]) {
      const response = await page.request.get(route, { maxRedirects: 0 });
      expect(response.status()).toBe(expected);
      if (expected === 307)
        expect(response.headers().location).toContain(
          change === 'password' ? '/primeiro-acesso' : '/entrar',
        );
    }
  });
}

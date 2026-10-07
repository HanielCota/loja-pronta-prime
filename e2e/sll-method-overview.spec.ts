import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { auth } from '@/server/auth/auth';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const run = randomUUID();
const trackId = randomUUID();
const stageIds = [randomUUID(), randomUUID(), randomUUID()];
const moduleIds = [randomUUID(), randomUUID(), randomUUID()];
const lessonIds = [randomUUID(), randomUUID()];
const email = `e2e-method-${run}@teste.com`;
let userId = '';

test.beforeAll(async () => {
  assertTestDatabase();
  const existing = await database().query(
    "select id from learning_tracks where kind='method' and status='published' and archived_at is null",
  );
  expect(existing.rows, 'Use uma base local sem Método publicado para este teste').toHaveLength(0);

  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Ana Teste Etapa 05',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  userId = user.id;
  await database().query('insert into student_products (user_id,product) values ($1,$2)', [
    userId,
    'sll',
  ]);
  await database().query(
    `insert into learning_tracks (id,kind,slug,title,description,status) values
      ($1,'method',$2,'Método SLL de teste','Um caminho simples em três etapas.','published')`,
    [trackId, `e2e-method-${run}`],
  );
  await database().query(
    `insert into learning_stages (id,track_id,slug,title,description,status,position) values
      ($1,$4,'etapa-1','Sua loja no ar em 7 dias','Comece pela base da sua loja.','published',0),
      ($2,$4,'etapa-2','Seu plano de 7 dias','Siga as ações do seu plano.','published',1),
      ($3,$4,'etapa-3','Biblioteca de Conhecimento','Consulte as aulas por assunto.','published',2)`,
    [...stageIds, trackId],
  );
  await database().query(
    `insert into learning_modules (id,stage_id,slug,title,status,position) values
      ($1,$4,'passo-1','Primeiro passo','published',0),
      ($2,$5,'passo-1','Primeiro dia','published',0),
      ($3,$6,'biblioteca','Categorias','published',0)`,
    [...moduleIds, ...stageIds],
  );
  await database().query(
    `insert into learning_lessons (id,module_id,slug,title,status,position) values
      ($1,$3,'aula-1','Aula da loja no ar','published',0),
      ($2,$4,'aula-1','Aula do plano de 7 dias','published',0)`,
    [...lessonIds, moduleIds[0]!, moduleIds[1]!],
  );
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=$1', [trackId]);
  await database().query('delete from "user" where id=$1 and email=$2', [userId, email]);
  await closeDatabase();
});

test('mostra estados corretos e mantém cartão, menu e URL direta coerentes', async ({ page }) => {
  await signIn(page, email, PASSWORD, '/sll/metodo');
  await expect(page).toHaveURL(/\/sll\/metodo$/);

  const stage1 = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Sua loja no ar em 7 dias', exact: true }),
  });
  const stage2 = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Seu plano de 7 dias', exact: true }),
  });
  const stage3 = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Biblioteca de Conhecimento', exact: true }),
  });
  await expect(stage1).toContainText('0 de 1 ações obrigatórias concluídas.');
  await expect(stage1.getByRole('link', { name: 'Começar etapa', exact: true })).toBeVisible();
  await expect(stage2).toContainText('Conclua Sua loja no ar em 7 dias');
  await expect(stage2.getByRole('link')).toHaveCount(0);
  await expect(stage3).toContainText('Esta etapa ainda está em preparação.');
  await expect(stage3.getByRole('link')).toHaveCount(0);
  const toolsLink = page.getByRole('link', { name: 'Acessar ferramentas', exact: true });
  await expect(toolsLink).toBeVisible();
  await expect(toolsLink).toHaveAttribute('href', '/sll/recursos');
  await mkdir('.data/sll-stage05-screens', { recursive: true });
  await page.screenshot({
    path: '.data/sll-stage05-screens/method-1440-light.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });

  await page.goto(`/sll/metodo/etapa/${stageIds[1]}`);
  await expect(page.getByText('Conclua Sua loja no ar em 7 dias', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Começar etapa', exact: true })).toHaveCount(0);

  await database().query(
    'insert into learning_lesson_progress (user_id,lesson_id,completed_at) values ($1,$2,now())',
    [userId, lessonIds[0]],
  );
  await page.goto('/sll/metodo');
  await expect(stage1.getByRole('link', { name: 'Revisar etapa', exact: true })).toBeVisible();
  await expect(stage2.getByRole('link', { name: 'Começar etapa', exact: true })).toBeVisible();
  await expect(stage3).toContainText('Esta etapa ainda está em preparação.');

  await database().query(
    'insert into learning_lesson_progress (user_id,lesson_id,completed_at) values ($1,$2,now())',
    [userId, lessonIds[1]],
  );
  await page.reload();
  await expect(stage2.getByRole('link', { name: 'Revisar etapa', exact: true })).toBeVisible();
  await expect(stage3).toContainText('Esta etapa ainda está em preparação.');
  await page.screenshot({
    path: '.data/sll-stage05-screens/method-1440-complete.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });

  await page.goto(`/sll/metodo/etapa/${stageIds[2]}`);
  await expect(
    page.getByText('Esta etapa ainda está em preparação.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('Conclua Seu plano de 7 dias', { exact: true })).toHaveCount(0);
});

test('mantém a leitura acessível nos temas claro e escuro em celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, email, PASSWORD, '/sll/metodo');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoA11yViolations(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  for (const buttonLabel of ['Ativar tema escuro', 'Ativar tema claro']) {
    await page.getByRole('button', { name: buttonLabel }).click();
    await expectNoA11yViolations(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await page.screenshot({
    path: '.data/sll-stage05-screens/method-390-dark.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(violations).toEqual([]);
});

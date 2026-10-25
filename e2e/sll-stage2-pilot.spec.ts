import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { starterPlaybooks } from '@/features/assistant/model';
import { auth } from '@/server/auth/auth';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const run = randomUUID();
const bookId = randomUUID();
const email = `e2e-stage2-${run}@teste.com`;
const trackId = randomUUID();
const stageOneId = randomUUID();
const stageTwoId = randomUUID();
const stageOneModuleId = randomUUID();
const dayOneModuleId = randomUUID();
const dayTwoModuleId = randomUUID();
const optionalModuleId = randomUUID();
const stageOneLessonId = randomUUID();
const dayOneLessonId = randomUUID();
const dayTwoLessonId = randomUUID();
const optionalLessonId = randomUUID();
let userId = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  assertTestDatabase();
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Ana Teste Etapa 2',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  userId = user.id;
  const book = starterPlaybooks()[0]!;
  await database().query(
    'insert into assistant_playbooks(id,title,strategy,actions,published_at) values($1,$2,$3,$4,now())',
    [bookId, book.title, book.strategy, JSON.stringify(book.actions)],
  );
  await database().query('insert into student_products (user_id, product) values ($1, $2)', [
    userId,
    'sll',
  ]);
  await database().query(
    `insert into learning_tracks (id,kind,slug,title,description,status)
     values ($1,'method',$2,'Método SLL — piloto da Etapa 2',$3,'published')`,
    [trackId, `e2e-stage2-${run}`, 'O caminho do SLL em três etapas.'],
  );
  await database().query(
    `insert into learning_stages (id,track_id,slug,title,description,status,position)
     values ($1,$3,'etapa-1','Etapa 1',$4,'published',0),
            ($2,$3,'etapa-2','Seu plano de 7 dias',$5,'published',1)`,
    [
      stageOneId,
      stageTwoId,
      trackId,
      'Concluída no cenário de teste.',
      'Saiba o que priorizar na sua loja.',
    ],
  );
  await database().query(
    `insert into learning_modules (id,stage_id,slug,title,status,position)
     values ($1,$5,'passo-1','Base','published',0),
            ($2,$6,'dia-1-perfil-da-loja','Dia 1 · Perfil da loja','published',0),
            ($3,$6,'dia-2-anuncios','Dia 2 · Anúncios','published',1),
            ($4,$6,'acoes-complementares','Ações complementares','published',2)`,
    [stageOneModuleId, dayOneModuleId, dayTwoModuleId, optionalModuleId, stageOneId, stageTwoId],
  );
  await database().query(
    `insert into learning_lessons (id,module_id,slug,title,description,status,position,counts_toward_progress)
     values ($1,$5,'aula-1','Base concluída','Aula de base.','published',0,true),
            ($2,$6,'acao-principal','Completar o perfil da loja (foto, nome, bio)',$7,'published',0,true),
            ($3,$8,'acao-principal','Reescrever títulos e descrições','Ação do segundo dia.','published',0,true),
            ($4,$9,'opcional','Criar um cupom','Ação opcional.','published',0,false)`,
    [
      stageOneLessonId,
      dayOneLessonId,
      dayTwoLessonId,
      optionalLessonId,
      stageOneModuleId,
      dayOneModuleId,
      'Abra o Perfil da Loja na Central do Vendedor e revise os dados principais.',
      dayTwoModuleId,
      optionalModuleId,
    ],
  );
  await database().query(
    `insert into learning_lesson_progress (user_id,lesson_id,completed_at,last_viewed_at)
     values ($1,$2,now(),now())`,
    [userId, stageOneLessonId],
  );
  await database().query('update learning_lessons set related_lesson_id=$1 where id=$2', [
    stageOneLessonId,
    dayOneLessonId,
  ]);
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=$1', [trackId]);
  await database().query('delete from "user" where id=$1 and email=$2', [userId, email]);
  await database().query('delete from assistant_playbooks where id=$1', [bookId]);
  await closeDatabase();
});

test('a entrada do plano funciona sem JavaScript', async ({ browser }) => {
  await database().query('delete from sll_plan_intake where user_id=$1', [userId]);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await signIn(page, email, PASSWORD, `/sll/metodo/etapa/${stageTwoId}`);
    await page.getByRole('link', { name: 'Abrir meu plano', exact: true }).click();
    await page
      .getByRole('radio', { name: 'Ainda não abri ou abri há menos de 7 dias', exact: true })
      .check();
    await page.getByRole('radio', { name: /^Orgânico/ }).check();
    await page.getByRole('button', { name: 'Organizar meu plano' }).click();
    await expect(page.getByRole('heading', { name: 'Sete dias · Orgânico' })).toBeVisible();
    await page.goto(`/sll/metodo/etapa/${stageTwoId}`);
    await expect(page.getByRole('heading', { name: 'Comece pelo primeiro dia' })).toBeVisible();
  } finally {
    await context.close();
    await database().query('delete from sll_plan_intake where user_id=$1', [userId]);
    await database().query('delete from assistant_plans where user_id=$1', [userId]);
  }
});

test('entrada do plano e conclusão do Dia 1 persistem', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, email, PASSWORD, `/sll/metodo/etapa/${stageTwoId}`);
  await page.getByRole('link', { name: 'Abrir meu plano', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Exatamente 7 dias', exact: true })).toBeVisible();
  await expectNoA11yViolations(page);

  await page
    .getByRole('radio', { name: 'Ainda não abri ou abri há menos de 7 dias', exact: true })
    .check();
  await page.getByRole('radio', { name: /^Orgânico/ }).check();
  await page.getByRole('button', { name: 'Organizar meu plano' }).click();
  await expect(page.getByRole('heading', { name: 'Sete dias · Orgânico' })).toBeVisible();
  await page.goto(`/sll/metodo/etapa/${stageTwoId}`);
  await expect(page.getByRole('heading', { name: 'Comece pelo primeiro dia' })).toBeVisible();
  await expect(page.getByText('Dia 1 de 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Ações complementares', { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: /Abrir aula completa/ }).click();
  await expect(page).toHaveURL(new RegExp(`/sll/aula/${stageOneLessonId}\\?voltar=`));
  await expect(page.getByRole('link', { name: 'Voltar ao plano', exact: true })).toHaveAttribute(
    'href',
    `/sll/metodo/etapa/${stageTwoId}`,
  );
  await page.goto(`/sll/metodo/etapa/${stageTwoId}`);

  await page.getByRole('button', { name: 'Marcar este dia como concluído' }).click();
  await expect(page.getByRole('button', { name: 'Desmarcar como concluída' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Marcar este dia como concluído' })).toBeVisible();
  await page
    .getByRole('region', { name: 'Comece pelo primeiro dia' })
    .locator('details')
    .first()
    .locator('summary')
    .click();
  await expect(page.getByRole('button', { name: 'Desmarcar como concluída' })).toBeVisible();

  const optionalSection = page.getByRole('region', { name: 'Ações complementares' });
  await optionalSection.locator('details').first().locator('summary').click();
  await optionalSection.getByRole('button', { name: 'Marcar ação como concluída' }).click();
  await expect(
    optionalSection.getByRole('button', { name: 'Desmarcar ação concluída' }),
  ).toBeVisible();
  await expect(
    page.getByText('1 de 2 ações obrigatórias concluídas.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  const optionalSectionAfterReload = page.getByRole('region', { name: 'Ações complementares' });
  await optionalSectionAfterReload.locator('details').first().locator('summary').click();
  await expect(
    optionalSectionAfterReload.getByRole('button', { name: 'Desmarcar ação concluída' }),
  ).toBeVisible();
  await expect(
    page.getByText('1 de 2 ações obrigatórias concluídas.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: '.data/sll-stage08-screens/stage2-day1-light.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });

  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoA11yViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '.data/sll-stage08-screens/stage2-day1-dark-mobile.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
});

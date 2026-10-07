import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { assertTestDatabase } from './support/cleanup';
import { database } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const password = 'senha-teste-123';
const email = `e2e-stage07-${randomUUID()}@teste.com`;
const lockedEmail = `e2e-stage07-locked-${randomUUID()}@teste.com`;
const preparingEmail = `e2e-stage07-preparing-${randomUUID()}@teste.com`;
const trackId = randomUUID();
const stageOneId = randomUUID();
const stageTwoId = randomUUID();
const stepOneId = randomUUID();
const stepTwoId = randomUUID();
const stepTwoStageId = randomUUID();
const lessons = {
  first: randomUUID(),
  second: randomUUID(),
  third: randomUUID(),
  nextStage: randomUUID(),
};
const userIds: string[] = [];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  assertTestDatabase();
  const db = database();
  const accounts: Array<[string, string]> = [
    [email, 'Ana Etapa 07'],
    [lockedEmail, 'Ana Etapa 07 Bloqueada'],
    [preparingEmail, 'Ana Etapa 07 Preparação'],
  ];
  for (const [accountEmail, name] of accounts) {
    const { user } = await auth.api.createUser({
      body: {
        email: accountEmail,
        password,
        name,
        role: 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    userIds.push(user.id);
    await db.query('insert into student_products (user_id,product) values ($1,$2)', [
      user.id,
      'sll',
    ]);
  }

  await db.query(
    `insert into learning_tracks (id,kind,slug,title,status) values ($1,'method',$2,'Método de teste da Etapa 07','published')`,
    [trackId, `e2e-stage07-${trackId}`],
  );
  await db.query(
    `insert into learning_stages (id,track_id,slug,title,position,status) values
      ($1,$3,'etapa-1','Etapa 1 de teste',0,'published'),
      ($2,$3,'etapa-2','Etapa 2 de teste',1,'published')`,
    [stageOneId, stageTwoId, trackId],
  );
  await db.query(
    `insert into learning_modules (id,stage_id,slug,title,position,status) values
      ($1,$4,'passo-1','Passo 1 de teste',0,'published'),
      ($2,$4,'passo-2','Passo 2 de teste',1,'published'),
      ($3,$5,'passo-1','Passo da Etapa 2',0,'published')`,
    [stepOneId, stepTwoId, stepTwoStageId, stageOneId, stageTwoId],
  );
  await db.query(
    `insert into learning_lessons (id,module_id,slug,title,position,status) values
      ($1,$5,'primeira','Primeira aula de teste',0,'published'),
      ($2,$5,'segunda','Segunda aula de teste',1,'published'),
      ($3,$6,'terceira','Última aula da Etapa 1',0,'published'),
      ($4,$7,'etapa-dois','Primeira aula da Etapa 2',0,'published')`,
    [
      lessons.first,
      lessons.second,
      lessons.third,
      lessons.nextStage,
      stepOneId,
      stepTwoId,
      stepTwoStageId,
    ],
  );
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=$1', [trackId]);
  await database().query('delete from "user" where id=any($1::text[])', [userIds]);
  await database().end();
});

test('navega entre passos e libera a Etapa 2 somente após concluir as aulas obrigatórias', async ({
  page,
}) => {
  await signIn(page, email, password, `/sll/metodo/etapa/${stageOneId}`);
  await expect(page).toHaveURL(new RegExp(`/sll/metodo/etapa/${stageOneId}$`));
  await page.getByRole('link', { name: /Primeira aula de teste/ }).click();
  await expect(page.locator('#lesson-title')).toHaveText('Primeira aula de teste');

  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(page.getByText('Aula concluída', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Próxima aula', exact: true }).click();
  await expect(page.locator('#lesson-title')).toHaveText('Segunda aula de teste');

  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Próximo passo', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Próximo passo', exact: true }).click();
  await expect(page.locator('#lesson-title')).toHaveText('Última aula da Etapa 1');

  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/sll/metodo/etapa/${stageTwoId}$`));
  await expect(page.getByRole('heading', { name: 'Etapa 2 de teste', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Etapa 2 de teste', exact: true })).toBeVisible();
});

test('Etapa 2 continua fechada para uma aluna sem a Etapa 1 concluída', async ({ page }) => {
  await signIn(page, lockedEmail, password, `/sll/metodo/etapa/${stageTwoId}`);
  await expect(page).toHaveURL(new RegExp(`/sll/metodo/etapa/${stageTwoId}$`));
  await expect(
    page.getByText('Conclua Etapa 1 de teste para abrir Etapa 2 de teste.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Primeira aula de teste/ })).toHaveCount(0);
});

test('mantém a aluna no contexto quando a próxima etapa está em preparação', async ({ page }) => {
  await database().query("update learning_stages set status='draft' where id=$1", [stageTwoId]);
  await database().query(
    `insert into learning_lesson_progress (user_id,lesson_id,completed_at)
     values ($1,$2,now()),($1,$3,now())`,
    [userIds[2], lessons.first, lessons.second],
  );
  await signIn(page, preparingEmail, password, `/sll/aula/${lessons.third}`);
  await expect(page.locator('#lesson-title')).toHaveText('Última aula da Etapa 1');
  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/sll/aula/${lessons.third}$`));
  await expect(page.locator('[aria-live="polite"]')).toHaveText(
    'A aula foi marcada como concluída. A etapa foi concluída. A próxima etapa ainda está em preparação.',
  );
});

test('o padrão expandido permanece utilizável no celular e no tema escuro', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, lockedEmail, password, `/sll/metodo/etapa/${stageOneId}`);
  await expectNoA11yViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: /Primeira aula de teste/ }).click();
  await expect(page.locator('#lesson-title')).toHaveText('Primeira aula de teste');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await expectNoA11yViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

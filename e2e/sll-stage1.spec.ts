import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { assertTestDatabase } from './support/cleanup';
import { database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const run = randomUUID();
const trackId = randomUUID();
const stageId = randomUUID();
const moduleId = randomUUID();
const nextModuleId = randomUUID();
const lessonIds = [randomUUID(), randomUUID()];
const email = `e2e-stage1-${run}@teste.com`;
let userId = '';

const lessonTitles = ['Comece por aqui', 'Credenciamento na Shopee + vinculação Escala Shop'];
const videoIds = [
  '44408d11-f282-4a43-9949-8b3c44b94ee4',
  '0b7a6732-eb05-417b-9882-5f82fd0d1a58',
] as const;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  assertTestDatabase();
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Ana Teste Etapa 1',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  userId = user.id;
  await database().query('insert into student_products (user_id, product) values ($1, $2)', [
    userId,
    'sll',
  ]);
  await database().query(
    `insert into learning_tracks (id,kind,slug,title,description,status)
     values ($1,'method',$2,$3,$4,'published')`,
    [
      trackId,
      `e2e-stage1-${run}`,
      'Método SLL — piloto da Etapa 1',
      'O caminho do SLL em três etapas.',
    ],
  );
  await database().query(
    `insert into learning_stages (id,track_id,slug,title,description,status)
     values ($1,$2,'etapa-1',$3,$4,'published')`,
    [
      stageId,
      trackId,
      'Sua loja no ar em 7 dias',
      'Comece pela sua conta de vendedora e avance no seu ritmo.',
    ],
  );
  await database().query(
    `insert into learning_modules (id,stage_id,slug,title,status,position)
     values ($1,$3,'passo-1',$4,'published',0),($2,$3,'passo-2','Passo não publicado','draft',1)`,
    [moduleId, nextModuleId, stageId, 'Ativando Sua Conta de Vendedora em 10 minutos'],
  );
  for (const [position, id] of lessonIds.entries()) {
    await database().query(
      `insert into learning_lessons
        (id,module_id,slug,title,description,duration_minutes,status,position)
       values ($1,$2,$3,$4,$5,$6,'published',$7)`,
      [
        id,
        moduleId,
        `aula-${position + 1}`,
        lessonTitles[position],
        position === 0 ? 'O jeito certo de começar a Etapa 1.' : 'Sua conta de vendedora ativa.',
        position === 0 ? 8 : 11,
        position,
      ],
    );
    await database().query(
      `insert into learning_content_blocks (lesson_id,kind,data,position)
       values ($1,'video',$2,0),($1,'text',$3,1)`,
      [
        id,
        JSON.stringify({ provider: 'pandavideo', videoId: videoIds[position] }),
        JSON.stringify({
          text:
            position === 0
              ? 'A aula de abertura da Etapa 1.'
              : 'O primeiro passo prático da jornada.',
        }),
      ],
    );
  }
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=$1', [trackId]);
  await database().query('delete from "user" where id=$1 and email=$2', [userId, email]);
  await database().end();
});

test('Etapa 1 abre o Passo 1 e mantém aula, ordem e progresso reais', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, email, PASSWORD, `/sll/metodo/etapa/${stageId}`);
  await expect(page).toHaveURL(new RegExp(`/sll/metodo/etapa/${stageId}$`));
  await expect(page.getByRole('heading', { name: 'Sua loja no ar em 7 dias' })).toBeVisible();
  await expect(page.getByText('PASSO 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Passo não publicado', { exact: true })).toHaveCount(0);
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
  await expect(page.locator('details').first().locator('li')).toHaveCount(2);
  await expect(page.locator('details').first()).toContainText('0 de 2 aulas concluídas');
  await expectNoA11yViolations(page);

  await page
    .locator('details')
    .first()
    .getByRole('link', { name: /Comece por aqui/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/sll/aula/${lessonIds[0]}$`));
  await expect(
    page.locator('p').filter({ hasText: 'Sua loja no ar em 7 dias' }).first(),
  ).toBeVisible();
  await expect(page.getByText('Passo 1', { exact: false }).first()).toBeVisible();
  await expect(page.locator('#lesson-title')).toHaveText(lessonTitles[0]!);
  await expect(page.getByRole('heading', { name: 'Vídeo confirmado' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aula anterior', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Próxima aula', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Aulas deste módulo' })).toContainText(
    '0 de 2 aulas concluídas',
  );

  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(page.getByText('Aula concluída', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Aulas deste módulo' })).toContainText(
    '1 de 2 aulas concluídas',
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Aulas deste módulo' })).toContainText(
    '1 de 2 aulas concluídas',
  );

  await page.getByRole('link', { name: 'Próxima aula', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/sll/aula/${lessonIds[1]}$`));
  await expect(page.locator('#lesson-title')).toHaveText(lessonTitles[1]!);
  await expect(page.getByRole('link', { name: 'Próxima aula', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Voltar às aulas', exact: true })).toBeVisible();

  await mkdir('.data/sll-stage06-screens', { recursive: true });
  await page.screenshot({
    path: '.data/sll-stage06-screens/lesson-1440-light.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoA11yViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '.data/sll-stage06-screens/lesson-390-dark.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
});

test('a conclusão do Passo 1 funciona sem JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await signIn(page, email, PASSWORD, `/sll/aula/${lessonIds[0]}`);
    await expect(page).toHaveURL(new RegExp(`/sll/aula/${lessonIds[0]}$`));
    await page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Marcar como concluída', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
    await expect(page.getByText('Aula concluída', { exact: true }).first()).toBeVisible();
  } finally {
    await context.close();
  }
});

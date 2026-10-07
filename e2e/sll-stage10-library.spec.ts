import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { assertTestDatabase } from './support/cleanup';
import { database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const run = randomUUID();
const trackId = randomUUID();
const stageIds = [randomUUID(), randomUUID(), randomUUID()];
const moduleIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const lessonIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const email = `e2e-sll-library-${run}@teste.com`;
let userId = '';

test.beforeAll(async () => {
  assertTestDatabase();
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Ana Teste Biblioteca',
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
    `insert into learning_tracks (id,kind,slug,title,description,status)
     values ($1,'method',$2,'Método SLL de teste','Consulte as aulas por assunto.','published')`,
    [trackId, `e2e-sll-library-${run}`],
  );
  await database().query(
    `insert into learning_stages (id,track_id,slug,title,description,status,position) values
      ($1,$4,'etapa-1','Sua loja no ar','Comece pela base.','published',0),
      ($2,$4,'etapa-2','Seu plano','Siga as ações.','published',1),
      ($3,$4,'etapa-3','Biblioteca de Conhecimento','Consulte por assunto.','published',2)`,
    [...stageIds, trackId],
  );
  await database().query(
    `insert into learning_modules (id,stage_id,slug,title,status,position) values
      ($1,$5,'passo-1','Primeiro passo','published',0),
      ($2,$6,'passo-1','Primeira ação','published',0),
      ($3,$7,'marketing','Central de Marketing','published',0),
      ($4,$7,'atendimento','Atendimento ao cliente','published',1)`,
    [...moduleIds, ...stageIds],
  );
  await database().query(
    `insert into learning_lessons
      (id,module_id,slug,title,description,duration_minutes,status,position) values
      ($1,$6,'aula-1','Base da loja','Aula inicial.',5,'published',0),
      ($2,$7,'aula-2','Plano inicial','Aula do plano.',5,'published',0),
      ($3,$8,'desconto','Desconto','Como usar desconto.',8,'published',0),
      ($4,$9,'avaliacoes','Avaliações da loja','Como conseguir avaliações reais.',13,'published',1),
      ($5,$9,'chat','Chat de Ouro','Como organizar o atendimento.',6,'published',0)`,
    [...lessonIds, moduleIds[0], moduleIds[1], moduleIds[2], moduleIds[3]],
  );
  await database().query(
    `insert into learning_content_blocks (lesson_id,kind,data,position)
     values ($1,'file',$2::jsonb,0)`,
    [
      lessonIds[3],
      JSON.stringify({
        storageKey: 'e2e/library/scripts.pdf',
        fileName: 'scripts.pdf',
        contentType: 'application/pdf',
        size: 1,
      }),
    ],
  );
  await database().query(
    `insert into learning_lesson_progress (user_id,lesson_id,completed_at)
     values ($1,$2,now()),($1,$3,now())`,
    [userId, lessonIds[0], lessonIds[1]],
  );
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=$1', [trackId]);
  await database().query('delete from "user" where id=$1 and email=$2', [userId, email]);
  await database().end();
});

test('busca, retorno e conclusão preservam a biblioteca publicada', async ({ page }) => {
  await signIn(page, email, PASSWORD, `/sll/metodo/etapa/${stageIds[2]}`);
  await expect(
    page.getByRole('heading', { name: 'Biblioteca de Conhecimento', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '3 aulas em 2 categorias', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('13 min · Material da aula', { exact: true })).toBeVisible();

  const search = page.getByLabel('Buscar aula ou tema');
  await search.fill('AVALIACOES');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(/q=AVALIACOES/);
  await expect(page.locator('p').filter({ hasText: '1 aula encontrada' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Atendimento ao cliente', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Central de Marketing', exact: true }),
  ).toHaveCount(0);

  const lessonCard = page.getByRole('link', { name: /Avaliações da loja.*Abrir aula/ });
  await expect(lessonCard).toHaveAttribute(
    'href',
    `/sll/aula/${lessonIds[3]}?voltar=%2Fsll%2Fmetodo%2Fetapa%2F${stageIds[2]}%3Fq%3DAVALIACOES%23library-lesson-${moduleIds[3]}-${lessonIds[3]}`,
  );
  await lessonCard.click();
  await expect(
    page.getByRole('heading', { name: 'Avaliações da loja', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar à biblioteca', exact: true })).toBeVisible();
  const previousLessonHref = await page
    .getByRole('link', { name: 'Aula anterior', exact: true })
    .getAttribute('href');
  expect(previousLessonHref).toMatch(
    /\/sll\/aula\/[^?]+\?voltar=%2Fsll%2Fmetodo%2Fetapa%2F[^%]+%3Fq%3DAVALIACOES%23library-lesson-[^?]+/,
  );
  expect(previousLessonHref).not.toContain(`library-lesson-${moduleIds[3]}-${lessonIds[3]}`);
  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Aula concluída' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à biblioteca', exact: true }).click();
  await expect(page).toHaveURL(/q=AVALIACOES#library-lesson-/);
  await expect(page.getByLabel('Buscar aula ou tema')).toHaveValue('AVALIACOES');
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();

  await search.fill('avaliações');
  await search.press('Enter');
  await expect(page).toHaveURL(/q=avalia%C3%A7%C3%B5es/);
  await expect(page.locator('p').filter({ hasText: '1 aula encontrada' })).toBeVisible();

  await search.fill('naoexiste');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(
    page.getByText('Nenhuma aula encontrada. Tente outra palavra.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Limpar busca', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/sll/metodo/etapa/${stageIds[2]}#library-title`));
  await expect(
    page.getByRole('heading', { name: '3 aulas em 2 categorias', exact: true }),
  ).toBeVisible();
});

test('aceita a busca pela URL sem JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'pt-BR' });
  const noJsPage = await context.newPage();

  try {
    await signIn(noJsPage, email, PASSWORD, `/sll/metodo/etapa/${stageIds[2]}`);
    await noJsPage.getByLabel('Buscar aula ou tema').fill('AVALIACOES');
    await noJsPage.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(noJsPage).toHaveURL(/q=AVALIACOES/);
    await expect(
      noJsPage.getByRole('heading', { name: 'Atendimento ao cliente', exact: true }),
    ).toBeVisible();
    await expect(noJsPage.getByText('Avaliações da loja', { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('mantém leitura acessível em celular e nos dois temas', async ({ page }) => {
  await signIn(page, email, PASSWORD, `/sll/metodo/etapa/${stageIds[2]}`);
  for (const themeButton of ['Ativar tema escuro', 'Ativar tema claro']) {
    await expectNoA11yViolations(page);
    await page.getByRole('button', { name: themeButton }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoA11yViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

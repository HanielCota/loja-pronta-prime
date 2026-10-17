import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { starterPlaybooks } from '@/features/assistant/model';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

const run = randomUUID();
const trackId = randomUUID(),
  stageId = randomUUID(),
  moduleId = randomUUID(),
  lessonId = randomUUID(),
  blockId = randomUUID();
const priVideo = randomUUID(),
  zeVideo = randomUUID();
const accounts = new Map<string, { id: string; email: string }>();
const bookIds: string[] = [];
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  assertTestDatabase();
  for (const kind of [
    'desktop-light',
    'desktop-dark',
    'mobile-light',
    'mobile-dark',
    'no-js',
    'pri',
    'ze',
    'admin',
  ]) {
    const email = `e2e-assistant-${run}-${kind}@teste.com`;
    const { user } = await auth.api.createUser({
      body: {
        email,
        password: PASSWORD,
        name: `Teste ${kind}`,
        role: kind === 'admin' ? 'admin' : 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    accounts.set(kind, { id: user.id, email });
    if (kind !== 'admin') {
      await database().query(
        "insert into student_products(user_id,product) values ($1,'sll'),($1,'loja-pronta')",
        [user.id],
      );
      await database().query('insert into stores(user_id,phase) values($1,5)', [user.id]);
    }
  }
  await database().query(
    "insert into learning_tracks(id,kind,slug,title,status) values($1,'complementary_course',$2,'Curso do assistente','published')",
    [trackId, `assistant-${run}`],
  );
  await database().query(
    "insert into learning_stages(id,track_id,slug,title,status) values($1,$2,'aulas','Aulas','published')",
    [stageId, trackId],
  );
  await database().query(
    "insert into learning_modules(id,stage_id,slug,title,status) values($1,$2,'aulas','Aulas','published')",
    [moduleId, stageId],
  );
  await database().query(
    "insert into learning_lessons(id,module_id,slug,title,status) values($1,$2,'execucao','Como executar a ação','published')",
    [lessonId, moduleId],
  );
  await database().query(
    "insert into learning_content_blocks(id,lesson_id,kind,data) values($1,$2,'video',$3)",
    [blockId, lessonId, JSON.stringify({ provider: 'pandavideo', videoId: priVideo })],
  );
  await database().query(
    "insert into learning_video_variants(block_id,expert,published_video_id,draft_video_id) values($1,'ze',$2,$3)",
    [blockId, zeVideo, randomUUID()],
  );
  await database().query(
    "insert into student_experiences(user_id,expert,manual_expert) values($1,'ze','ze')",
    [accounts.get('ze')!.id],
  );
  for (const book of starterPlaybooks()) {
    const id = randomUUID();
    bookIds.push(id);
    book.actions[0]!.lessonId = lessonId;
    await database().query(
      'insert into assistant_playbooks(id,title,strategy,revision,actions,published_at) values($1,$2,$3,1,$4,now())',
      [id, `Roteiro ${run}`, book.strategy, JSON.stringify(book.actions)],
    );
  }
  await mkdir('.data/assistant-screens', { recursive: true });
});
test.afterAll(async () => {
  assertTestDatabase();
  for (const account of accounts.values())
    await database().query('delete from "user" where id=$1', [account.id]);
  await database().query('delete from assistant_playbooks where id=any($1::uuid[])', [bookIds]);
  await database().query('delete from learning_tracks where id=$1', [trackId]);
  await closeDatabase();
});

for (const size of [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'mobile', width: 390, height: 844 },
])
  for (const theme of ['light', 'dark']) {
    test(`${size.name} ${theme}: plano, progresso, conexão SLL e catálogo sem integração`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await signIn(page, accounts.get(`${size.name}-${theme}`)!.email, PASSWORD, '/sll/plano');
      await expect(
        page.getByRole('heading', { name: 'Vamos organizar seu próximo passo' }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      await page.getByRole('radio', { name: 'Menos de 7 dias', exact: true }).check();
      await page.getByRole('button', { name: 'Organizar meu plano', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Sete dias · Orgânico' })).toBeVisible();
      await page.getByRole('button', { name: 'Marcar como feita', exact: true }).first().click();
      await expect(page.getByText('1 de 7 ações concluídas. Siga no seu ritmo.')).toBeVisible();
      await page.reload();
      await expect(page.getByText('1 de 7 ações concluídas. Siga no seu ritmo.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver a aula', exact: true })).toHaveAttribute(
        'href',
        `/sll/aula/${lessonId}`,
      );
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.data/assistant-screens/plan-${size.name}-${theme}.png`,
        fullPage: true,
      });
      const progress = await database().query(
        'select 1 from learning_lesson_progress where user_id=$1 and lesson_id=$2 and completed_at is not null',
        [accounts.get(`${size.name}-${theme}`)!.id, lessonId],
      );
      expect(progress.rowCount).toBe(0);
      await page.goto('/sll/minhas-lojas/conectar');
      await expect(page.getByText(/não exige comprar a Loja Pronta/)).toBeVisible();
      await expect(page.getByRole('link', { name: /Abrir a Central do Vendedor/ })).toHaveAttribute(
        'href',
        'https://seller.shopee.com.br/',
      );
      await expectNoA11yViolations(page);
      await page.goto('/sll/comparar-categorias');
      await expect(
        page.getByRole('heading', { name: 'Comparar categorias', exact: true }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      await page.goto('/loja-pronta/produtos');
      await expect(
        page.getByRole('heading', { name: 'Produtos da minha loja', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Conferir conexão' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Confirmar seleção e publicar' })).toHaveCount(
        0,
      );
      await expectNoA11yViolations(page);
      await page.screenshot({
        path: `.data/assistant-screens/products-${size.name}-${theme}.png`,
        fullPage: true,
      });
    });
  }

test('sete dias exatos usa histórico e o formulário funciona sem JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await signIn(page, accounts.get('no-js')!.email, PASSWORD, '/sll/plano');
    await page.getByRole('radio', { name: 'Exatamente 7 dias', exact: true }).check();
    await page.getByRole('button', { name: 'Organizar meu plano' }).click();
    await expect(
      page.getByRole('heading', { name: 'Seu próximo passo começa pelos dados' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sete dias · Orgânico' })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('vídeos por expert preservam a mesma aula e não mostram rascunho ou outro apresentador', async ({
  browser,
}) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  try {
    const pri = await contexts[0]!.newPage(),
      ze = await contexts[1]!.newPage();
    for (const page of [pri, ze])
      await page.route('https://player-*.tv.pandavideo.com.br/**', (route) => route.abort());
    await signIn(pri, accounts.get('pri')!.email, PASSWORD, `/sll/aula/${lessonId}`);
    await signIn(ze, accounts.get('ze')!.email, PASSWORD, `/sll/aula/${lessonId}`);
    await expect(pri.locator('iframe')).toHaveAttribute('src', new RegExp(priVideo));
    await expect(ze.locator('iframe')).toHaveAttribute('src', new RegExp(zeVideo));
    await pri.reload();
    await expect(pri.locator('iframe')).toHaveAttribute('src', new RegExp(priVideo));
    await database().query(
      "update learning_video_variants set published_video_id=null where block_id=$1 and expert='ze'",
      [blockId],
    );
    await ze.reload();
    await expect(ze.getByRole('heading', { name: 'Vídeo em breve' })).toBeVisible();
    await expect(ze.locator('iframe')).toHaveCount(0);
    await expect(
      pri.getByRole('button', { name: 'Marcar como concluída', exact: true }),
    ).toBeVisible();
  } finally {
    for (const context of contexts) await context.close();
  }
});

test('admin configura roteiros e experts com os componentes acessíveis existentes', async ({
  page,
}) => {
  await signIn(page, accounts.get('admin')!.email, PASSWORD, '/admin/assistente');
  await expect(page.getByRole('heading', { name: 'Roteiros de sete dias' })).toBeVisible();
  await page.locator('details').first().locator('summary').click();
  await expectNoA11yViolations(page);
  await page.goto('/admin/experts');
  await expect(page.getByRole('heading', { name: 'Origem das compras' })).toBeVisible();
  await expectNoA11yViolations(page);
});

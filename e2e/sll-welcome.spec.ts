import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { auth } from '@/server/auth/auth';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

// Catálogo temporário com os títulos confirmados no T01. Os rascunhos reais permanecem intactos.
const run = randomUUID();
const trackId = randomUUID();
const methodId = randomUUID();
const stageId = randomUUID();
const moduleId = randomUUID();
const methodStageId = randomUUID();
const methodModuleId = randomUUID();
const methodLessonId = randomUUID();
const draftId = randomUUID();
const lessonIds = Array.from({ length: 6 }, () => randomUUID());
const titles = [
  'Boas-vindas ao SLL',
  'A tribo das soberanas',
  'A decisão para se tornar uma soberana',
  'Como eu saí de CLT para faturar mais de 2 milhões',
  'Entrevista Lari e Leo',
  'Você vai agir por decisão e não por condição',
];
const emails = [`e2e-welcome-${run}@teste.com`, `e2e-welcome-other-${run}@teste.com`];
const userIds: string[] = [];
const lessonUrl = (index: number) => `/sll/comece-aqui?aula=${lessonIds[index]}`;
const waitForLessonView = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/sll/comece-aqui' &&
      Boolean(response.request().postData()?.includes(trackId)),
  );

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  assertTestDatabase();
  const existing = await database().query(
    "select id from learning_tracks where kind in ('welcome','method') and status='published' and archived_at is null",
  );
  // Não troca o primeiro catálogo de uma base que já tenha conteúdo publicado de verdade.
  expect(
    existing.rows,
    'Use uma base local sem boas-vindas/Método publicados para este teste',
  ).toHaveLength(0);
  for (const email of emails) {
    const { user } = await auth.api.createUser({
      body: {
        email,
        password: PASSWORD,
        name: 'Ana Teste Etapa 04',
        role: 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    userIds.push(user.id);
    await database().query('insert into student_products (user_id,product) values ($1,$2)', [
      user.id,
      'sll',
    ]);
  }
  await database().query(
    `insert into learning_tracks (id,kind,slug,title,description,status) values
      ($1,'welcome',$3,'Comece aqui','Antes de começar as aulas, assista a esta mensagem da Pri. Ela vai te mostrar como aproveitar o SLL com clareza, no seu ritmo e com um caminho simples para começar.','published'),
      ($2,'method',$4,'Método de teste da Etapa 04',null,'published')`,
    [trackId, methodId, `e2e-welcome-${run}`, `e2e-method-${run}`],
  );
  await database().query(
    `insert into learning_stages (id,track_id,slug,title,status) values
      ($1,$3,'aulas','Trilha de boas-vindas','published'),
      ($2,$4,'etapa-1','Etapa 1 de teste','published')`,
    [stageId, methodStageId, trackId, methodId],
  );
  await database().query(
    `insert into learning_modules (id,stage_id,slug,title,status) values
      ($1,$3,'aulas','Aulas','published'),($2,$4,'aulas','Aulas de teste','published')`,
    [moduleId, methodModuleId, stageId, methodStageId],
  );
  for (const [index, id] of lessonIds.entries()) {
    await database().query(
      "insert into learning_lessons (id,module_id,slug,title,status,position) values ($1,$2,$3,$4,'published',$5)",
      [id, moduleId, `aula-${index + 1}`, titles[index], index],
    );
    // A quarta aula não tem bloco de vídeo: também deve mostrar o aviso compacto.
    if (index !== 3) {
      await database().query(
        "insert into learning_content_blocks (lesson_id,kind,data) values ($1,'video',$2)",
        [id, JSON.stringify({ provider: 'pandavideo', videoId: '' })],
      );
    }
  }
  await database().query(
    `insert into learning_lessons (id,module_id,slug,title,status,position) values
      ($1,$3,'rascunho','Aula em rascunho','draft',6),
      ($2,$4,'teste','Aula do Método de teste','published',0)`,
    [draftId, methodLessonId, moduleId, methodModuleId],
  );
});

test.afterAll(async () => {
  assertTestDatabase();
  await database().query('delete from learning_tracks where id=any($1::uuid[]) and slug like $2', [
    [trackId, methodId],
    `e2e-%-${run}`,
  ]);
  await database().query('delete from "user" where id=any($1::text[]) and email=any($2::text[])', [
    userIds,
    emails,
  ]);
  await closeDatabase();
});

test('link direto preserva a aula escolhida durante o login', async ({ page }) => {
  await page.goto(lessonUrl(2));
  await expect(page).toHaveURL(/\/entrar\?next=/);
  expect(new URL(page.url()).searchParams.get('next')).toBe(lessonUrl(2));
  await page.getByLabel('Email da compra').fill(emails[1]!);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  const viewSaved = waitForLessonView(page);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(lessonUrl(2));
  await expect(page.locator('#lesson-title')).toHaveText(titles[2]!);
  await viewSaved;
  await page.goto('/sll');
  const path = page.getByRole('region', { name: 'Seu caminho no curso' });
  await expect(path.getByRole('link', { name: /Trilha de boas-vindas/ })).toHaveAttribute(
    'href',
    lessonUrl(2),
  );
});

test('sequência, link antigo, recarga, Voltar, conclusão e avanço explícito', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  await page.setViewportSize({ width: 1440, height: 960 });
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, emails[0]!, PASSWORD, '/sll');
  await expect(page).toHaveURL(/\/sll$/);
  const dashboardPath = page.getByRole('region', { name: 'Seu caminho no curso' });
  const firstViewSaved = waitForLessonView(page);
  await dashboardPath.getByRole('link', { name: /Trilha de boas-vindas/ }).click();
  await expect(page).toHaveURL(lessonUrl(0));
  await firstViewSaved;
  const sequence = page.getByRole('complementary', { name: 'Aulas deste módulo' });
  await expect(sequence.locator('li')).toHaveCount(6);
  await expect(sequence.locator('li').allTextContents()).resolves.toEqual(
    titles.map((title, i) => `${i + 1}${title}`),
  );
  await expect(page.getByRole('heading', { name: 'Vídeo em breve' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aula anterior', exact: true })).toHaveCount(0);
  const secondViewSaved = waitForLessonView(page);
  await page.getByRole('link', { name: 'Próxima aula', exact: true }).click();
  await expect(page).toHaveURL(lessonUrl(1));
  await secondViewSaved;
  await expect(page.locator('#lesson-title')).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Marcar como concluída', exact: true }),
  ).toBeVisible();
  const reloadedViewSaved = waitForLessonView(page);
  await page.reload();
  await reloadedViewSaved;
  await expect(page.locator('#lesson-title')).toHaveText(titles[1]!);
  const backViewSaved = waitForLessonView(page);
  await page.goBack();
  await backViewSaved;
  await expect(page).toHaveURL(lessonUrl(0));
  await expect(page.locator('#lesson-title')).toHaveText(titles[0]!);
  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
  ).toBeVisible();
  await expect(sequence).toContainText('1 de 6 aulas concluídas');
  await expect(page).toHaveURL(lessonUrl(0));
  await mkdir('.data/sll-stage04-screens', { recursive: true });
  await page.screenshot({
    path: '.data/sll-stage04-screens/welcome-completed-1440-light.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
  const thirdViewSaved = waitForLessonView(page);
  await page.getByRole('link', { name: 'Próxima aula', exact: true }).click();
  await thirdViewSaved;
  await expect(page.locator('#lesson-title')).toHaveText(titles[1]!);
  await expect(
    page.getByRole('button', { name: 'Marcar como concluída', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
  ).toHaveCount(0);
  const legacyViewSaved = waitForLessonView(page);
  await page.goto(`/sll/aula/${lessonIds[3]}`);
  await legacyViewSaved;
  await expect(page).toHaveURL(lessonUrl(3));
  await expect(page.locator('#lesson-title')).toHaveText(titles[3]!);
  await expect(page.locator('iframe')).toHaveCount(0);
  const lastViewSaved = waitForLessonView(page);
  await page.goto(lessonUrl(5));
  await lastViewSaved;
  await expect(page.getByRole('link', { name: 'Próxima aula', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ver etapas do método', exact: true })).toHaveCount(
    0,
  );
  for (const id of lessonIds.slice(1, 5)) {
    await database().query(
      'insert into learning_lesson_progress (user_id,lesson_id,completed_at) values ($1,$2,now()) on conflict (user_id,lesson_id) do update set completed_at=excluded.completed_at',
      [userIds[0], id],
    );
  }
  const completedViewSaved = waitForLessonView(page);
  await page.reload();
  await completedViewSaved;
  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(sequence).toContainText('6 de 6 aulas concluídas');
  await expect(page).toHaveURL(lessonUrl(5));
  const methodLink = page.getByRole('link', { name: 'Ver etapas do método', exact: true });
  await expect(methodLink).toHaveCount(1);
  await expect(methodLink).toHaveAttribute('href', '/sll/metodo');
  await page.screenshot({
    path: '.data/sll-stage04-screens/welcome-track-completed-1440-light.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
  await methodLink.click();
  await expect(page).toHaveURL(/\/sll\/metodo$/);
  await expect(
    page.getByRole('heading', { name: 'Método de teste da Etapa 04', exact: true }),
  ).toBeVisible();
  const reopenedViewSaved = waitForLessonView(page);
  await page.goto(lessonUrl(5));
  await reopenedViewSaved;
  const refreshedViewSaved = waitForLessonView(page);
  await page.reload();
  await refreshedViewSaved;
  await expect(sequence).toContainText('6 de 6 aulas concluídas');
  await page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }).click();
  await expect(sequence).toContainText('5 de 6 aulas concluídas');
  await expect(methodLink).toHaveCount(0);
  await page.goto(`/sll/aula/${draftId}`);
  await expect(page.getByRole('heading', { name: 'Essa página não existe' })).toBeVisible();
  const resumedViewSaved = waitForLessonView(page);
  await page.goto(`/sll/comece-aqui?aula=${draftId}`);
  await expect(page).not.toHaveURL(new RegExp(draftId));
  await resumedViewSaved;
  const otherProgress = await database().query(
    'select lesson_id from learning_lesson_progress where user_id=$1',
    [userIds[1]],
  );
  expect(otherProgress.rows.map(({ lesson_id }) => lesson_id)).toEqual([lessonIds[2]]);
  expect(errors).toEqual([]);
});

test('salvamento recusado mantém conclusão e permite tentar outra vez', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, emails[0]!, PASSWORD, lessonUrl(0));
  await expect(page).toHaveURL(lessonUrl(0));
  await expect(
    page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
  ).toBeVisible();
  // Um formulário adulterado não pode escrever na aula em rascunho nem apagar a aula atual.
  await page.locator('input[name="lessonId"]').evaluate((input, id) => {
    (input as HTMLInputElement).value = id;
  }, draftId);
  await page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }).click();
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Esta aula não está disponível.');
  await expect(
    page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
  ).toBeVisible();
  const saved = await database().query(
    'select completed_at from learning_lesson_progress where user_id=$1 and lesson_id=$2',
    [userIds[0], lessonIds[0]],
  );
  expect(saved.rows[0].completed_at).not.toBeNull();
  await page.locator('input[name="lessonId"]').evaluate((input, id) => {
    (input as HTMLInputElement).value = id;
  }, lessonIds[0]!);
  await page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }).click();
  await expect(page.locator('[aria-live="polite"]')).toHaveText(
    'A conclusão da aula foi desfeita.',
  );
  await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
  await expect(page.locator('[aria-live="polite"]')).toHaveText(
    'A aula foi marcada como concluída.',
  );
  const records = await database().query(
    'select count(*)::int as count from learning_lesson_progress where user_id=$1 and lesson_id=$2',
    [userIds[0], lessonIds[0]],
  );
  expect(records.rows[0].count).toBe(1);
});

test('falha do banco não anuncia sucesso nem apaga a conclusão', async ({ page }) => {
  test.setTimeout(60_000);
  const viewSaved = waitForLessonView(page);
  await signIn(page, emails[0]!, PASSWORD, lessonUrl(0));
  await viewSaved;
  await expect(
    page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
  ).toBeVisible();
  const failureName = `e2e_welcome_failure_${run.replaceAll('-', '')}`;
  // A falha se aplica somente a uma aula temporária desta execução e sai no finally.
  await database().query(`create function ${failureName}() returns trigger language plpgsql as $$
    begin
      if TG_OP = 'UPDATE' and NEW.user_id = '${userIds[0]}' and
         NEW.lesson_id = '${lessonIds[0]}'::uuid and
         NEW.completed_at is distinct from OLD.completed_at then
        raise exception 'Falha de escrita da aula temporária de teste';
      end if;
      return NEW;
    end; $$`);
  try {
    await database().query(
      `create trigger ${failureName} before insert or update on learning_lesson_progress for each row execute function ${failureName}()`,
    );
    await page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }).click();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      'Não foi possível salvar a conclusão. Tente novamente.',
    );
    await expect(
      page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
    ).toBeVisible();
    const saved = await database().query(
      'select completed_at from learning_lesson_progress where user_id=$1 and lesson_id=$2',
      [userIds[0], lessonIds[0]],
    );
    expect(saved.rows[0].completed_at).not.toBeNull();
  } finally {
    await database().query(`drop trigger if exists ${failureName} on learning_lesson_progress`);
    await database().query(`drop function ${failureName}()`);
  }
  await page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }).click();
  await expect(page.locator('[aria-live="polite"]')).toHaveText(
    'A conclusão da aula foi desfeita.',
  );
});

test('conclusão e sequência funcionam sem JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await signIn(page, emails[1]!, PASSWORD, lessonUrl(2));
    await expect(page).toHaveURL(lessonUrl(2));
    await page.getByRole('button', { name: 'Marcar como concluída', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Aulas deste módulo' })).toContainText(
      '1 de 6 aulas concluídas',
    );
    await expect(page).toHaveURL(lessonUrl(2));
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Desmarcar como concluída', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Próxima aula', exact: true }).click();
    await expect(page).toHaveURL(lessonUrl(3));
    await expect(
      page.getByRole('button', { name: 'Marcar como concluída', exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test('matriz visual, teclado, texto maior, contraste e movimento reduzido', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, emails[0]!, PASSWORD, lessonUrl(3));
  await expect(page).toHaveURL(lessonUrl(3));
  await mkdir('.data/sll-stage04-screens', { recursive: true });
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => animation.playState !== 'running'),
      );
    }
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await expect(
        page.getByRole('link', { name: 'Loja Pronta Prime', exact: true }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const heading = await page.locator('#lesson-title').boundingBox();
      const list = await page
        .getByRole('complementary', { name: 'Aulas deste módulo' })
        .boundingBox();
      expect(heading).not.toBeNull();
      expect(list).not.toBeNull();
      if (width >= 1280) expect(list!.x).toBeGreaterThan(heading!.x);
      else expect(list!.y).toBeGreaterThan(heading!.y);
      const targets = await page
        .locator('#sll-content a, #sll-content button')
        .evaluateAll((nodes) =>
          nodes
            .filter((node) => node.getClientRects().length > 0)
            .map((node) => ({
              label: node.textContent,
              height: node.getBoundingClientRect().height,
            })),
        );
      expect(targets.filter((target) => target.height < 44)).toEqual([]);
      await page.screenshot({
        path: `.data/sll-stage04-screens/welcome-${width}-${theme}.png`,
        fullPage: true,
        style: 'nextjs-portal { visibility: hidden; }',
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page
      .getByRole('button', { name: theme === 'light' ? 'Ativar tema claro' : 'Ativar tema escuro' })
      .click();
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== 'running'),
    );
    for (const textSize of ['grande', 'maior']) {
      await page.evaluate(
        (size) => document.documentElement.setAttribute('data-text', size),
        textSize,
      );
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-contrast', 'more');
      document.documentElement.setAttribute('data-motion', 'reduce');
    });
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== 'running'),
    );
    await expectNoA11yViolations(page);
    await page.screenshot({
      path: `.data/sll-stage04-screens/welcome-390-more-contrast-${theme}.png`,
      fullPage: true,
      style: 'nextjs-portal { visibility: hidden; }',
    });
    await page.evaluate(() => document.documentElement.removeAttribute('data-contrast'));
  }
  const sections = page.locator('#sll-content details').first();
  const nav = sections.locator('summary');
  await nav.focus();
  await page.keyboard.press('Enter');
  await expect(sections).toHaveAttribute('open', '');
  await expect(page.getByRole('link', { name: 'Método SLL', exact: true })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.keyboard.press('Enter');
  await expect(sections).not.toHaveAttribute('open', '');
  await expect(nav).toBeFocused();
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
  await page.screenshot({
    path: '.data/sll-stage04-screens/welcome-390-forced-colors.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
  // No alto contraste, o Chrome pinta as cores do sistema, mas o axe lê as cores originais
  // do tema. O contraste desse modo é conferido na captura; o axe confere as demais regras.
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })),
  ).toEqual([]);
  await page.getByRole('link', { name: 'Próxima aula', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(lessonUrl(4));
  await expect(page.locator('#lesson-title')).toBeFocused();
});

test('catálogo em rascunho conserva o estado de conteúdo indisponível', async ({ page }) => {
  await database().query("update learning_tracks set status='draft' where id=$1", [trackId]);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, emails[1]!, PASSWORD, '/sll/comece-aqui');
  await expect(
    page.getByText('A trilha de boas-vindas ainda não está disponível.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Marcar como concluída', exact: true }),
  ).toHaveCount(0);
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: '.data/sll-stage04-screens/welcome-unpublished-390-light.png',
    fullPage: true,
    style: 'nextjs-portal { visibility: hidden; }',
  });
});
